import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  hashVerificationSecret,
  sanitizeNextPath,
  upsertVerifiedUser,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { createServerSupabaseAuthClient } from "@/lib/supabaseClient";

/**
 * POST /api/auth/email/verify
 * Verifies the 6-digit OTP sent via Resend/SMTP or Supabase Auth, marks emailVerified = true,
 * and issues the HttpOnly JWT session cookie ONLY after cryptographic proof succeeds.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cleanEmail = String(body?.email || "").trim().toLowerCase();
    const rawCode = String(body?.code || "").trim().replace(/\s+/g, "");
    const next = sanitizeNextPath(body?.next);

    if (!cleanEmail || !cleanEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required." },
        { status: 400 }
      );
    }

    if (!rawCode || !/^\d{6,8}$/.test(rawCode)) {
      return NextResponse.json(
        { error: "Enter the 6-digit verification code from your inbox." },
        { status: 400 }
      );
    }

    let verified = false;

    // 1. Check PostgreSQL AuthVerificationToken table (Resend / SMTP codes)
    const tokenRecord = await prisma.authVerificationToken.findFirst({
      where: {
        email: cleanEmail,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (tokenRecord) {
      if (tokenRecord.attempts >= 5) {
        return NextResponse.json(
          {
            error:
              "Too many invalid code attempts. Please request a fresh verification email.",
          },
          { status: 429 }
        );
      }

      const expectedHash = hashVerificationSecret(rawCode);
      if (tokenRecord.codeHash === expectedHash) {
        await prisma.authVerificationToken.update({
          where: { id: tokenRecord.id },
          data: { consumedAt: new Date() },
        });
        verified = true;
      } else {
        await prisma.authVerificationToken.update({
          where: { id: tokenRecord.id },
          data: { attempts: { increment: 1 } },
        });
      }
    }

    // 2. If not verified via local table, verify with Supabase Auth OTP
    if (!verified) {
      const sb = createServerSupabaseAuthClient();
      const otpTypes: Array<"email" | "magiclink" | "signup"> = [
        "email",
        "magiclink",
        "signup",
      ];

      for (const otpType of otpTypes) {
        const { data, error } = await sb.auth.verifyOtp({
          email: cleanEmail,
          token: rawCode,
          type: otpType,
        });
        if (!error && data?.user?.email?.toLowerCase() === cleanEmail) {
          verified = true;
          break;
        }
      }
    }

    if (!verified) {
      return NextResponse.json(
        {
          error:
            "Invalid or expired verification code. Please double-check the code or request a new one.",
        },
        { status: 401 }
      );
    }

    const user = await upsertVerifiedUser({
      email: cleanEmail,
      provider: "email",
    });

    const response = NextResponse.json({
      success: true,
      redirectTo: next,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profile: user.profile,
        subscription: user.subscription,
      },
    });

    return attachSessionCookie(response, user);
  } catch (err: unknown) {
    console.error("Email OTP verification error:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to verify confirmation code.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

