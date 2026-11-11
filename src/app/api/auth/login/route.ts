import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  getRequestOrigin,
  sanitizeNextPath,
  verifyPassword,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { issueAndSendEmailVerification } from "@/lib/mailer";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, next } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: {
        profile: true,
        subscription: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.passwordHash.startsWith("$2")) {
      return NextResponse.json(
        {
          error:
            "This account was created via OAuth or Email Code. Sign in with your provider or use Email Code verification.",
        },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(String(password), user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    if (!user.emailVerified) {
      const origin = getRequestOrigin(req);
      const recentToken = await prisma.authVerificationToken.findFirst({
        where: {
          email: cleanEmail,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - 60_000) },
        },
        select: { id: true },
      });

      const delivery = recentToken
        ? null
        : await issueAndSendEmailVerification({
            email: cleanEmail,
            purpose: "VERIFY_EMAIL",
            origin,
            next: sanitizeNextPath(next),
          }).catch(() => null);

      return NextResponse.json(
        {
          error: recentToken
            ? `A confirmation link was already sent to ${cleanEmail}. Check your inbox or wait a moment to resend.`
            : delivery?.ok
            ? `Your email is not verified yet. We just sent a new confirmation link & code to ${cleanEmail}.`
            : "Your email is not verified yet. Please check your inbox and verify your email first.",
          requiresVerification: true,
          email: cleanEmail,
        },
        { status: 403 }
      );
    }

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profile: user.profile,
        subscription: user.subscription,
      },
    });

    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
