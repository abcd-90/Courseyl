import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  clearPendingVerifyCookie,
  hashVerificationSecret,
  readPendingVerifyCookie,
  sanitizeNextPath,
  upsertVerifiedUser,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/auth/email/status
 * Polled silently by the waiting browser tab (Desktop/Laptop) so the moment
 * the user clicks "Verify Email" in Gmail (even from a mobile phone), BOTH
 * browsers sign in cleanly and navigate straight to /dashboard.
 */
export async function GET() {
  try {
    const pending = await readPendingVerifyCookie();
    if (!pending) {
      return NextResponse.json({ verified: false });
    }

    const cleanEmail = pending.email.trim().toLowerCase();
    const pollHash = hashVerificationSecret(pending.pollSecret);
    const now = new Date();

    const verifiedRecord = await prisma.authVerificationToken.findFirst({
      where: {
        email: cleanEmail,
        pollHash,
        verifiedAt: { not: null },
        pollConsumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { verifiedAt: "desc" },
    });

    if (!verifiedRecord) {
      return NextResponse.json({ verified: false });
    }

    // Atomic one-time claim so two concurrent poll requests cannot race
    const claimed = await prisma.authVerificationToken.updateMany({
      where: {
        email: cleanEmail,
        pollHash,
        pollConsumedAt: null,
      },
      data: { pollConsumedAt: now },
    });

    if (claimed.count === 0) {
      return NextResponse.json({ verified: false });
    }

    const user = await upsertVerifiedUser({
      email: cleanEmail,
      provider: "email",
    });

    const redirectTo = sanitizeNextPath(
      verifiedRecord.nextPath || pending.next
    );

    const response = NextResponse.json({
      verified: true,
      redirectTo,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        profile: user.profile,
        subscription: user.subscription,
      },
    });

    clearPendingVerifyCookie(response);
    return attachSessionCookie(response, user);
  } catch (err) {
    console.error("[email/status] Error checking pending confirmation:", err);
    return NextResponse.json({ verified: false });
  }
}

