import { NextResponse } from "next/server";
import crypto from "crypto";
import { getCurrentUser, signToken, getAuthCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const OWNER_EMAILS = ["sheikhsami3082@gmail.com"];

function timingSafeEqualStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, role: null }, { status: 401 });
    }

    const isAdmin = user.role === "ADMIN";
    const isPreAuthorized =
      Boolean(user.emailVerified) && OWNER_EMAILS.includes(user.email.toLowerCase());

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      role: user.role,
      isAdmin,
      isPreAuthorized,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error verifying admin status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in before claiming admin rights." },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const secretKey = typeof body?.secretKey === "string" ? body.secretKey.trim() : "";

    const isVerifiedOwner =
      Boolean(user.emailVerified) && OWNER_EMAILS.includes(user.email.toLowerCase());
    const envSecret = process.env.ADMIN_SETUP_SECRET?.trim();
    const isEnvKeyValid = Boolean(
      envSecret && secretKey && timingSafeEqualStr(secretKey, envSecret)
    );

    if (!isVerifiedOwner && !isEnvKeyValid) {
      return NextResponse.json(
        { error: "Forbidden: Only the verified owner can access administrator privileges." },
        { status: 403 }
      );
    }

    // Update user role to ADMIN in Postgres
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    // Re-issue JWT cookie with updated role
    const token = signToken({
      userId: updated.id,
      email: updated.email,
      role: "ADMIN",
    });

    const cookieStore = await cookies();
    cookieStore.set({
      ...getAuthCookieOptions(),
      value: token,
    });

    return NextResponse.json({
      success: true,
      message: `Administrator privileges successfully granted to ${updated.email}!`,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error claiming admin rights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

