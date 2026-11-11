import { NextResponse } from "next/server";
import {
  attachSessionCookie,
  getRequestOrigin,
  hashVerificationSecret,
  sanitizeNextPath,
  upsertVerifiedUser,
} from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * GET /api/auth/email/confirm
 * Handles one-click email confirmation URLs issued by Resend / SMTP mailer.
 */
export async function GET(req: Request) {
  const origin = getRequestOrigin(req);

  try {
    const { searchParams } = new URL(req.url);
    const rawToken = searchParams.get("token")?.trim() || "";
    const email = searchParams.get("email")?.trim().toLowerCase() || "";
    const next = sanitizeNextPath(searchParams.get("next"));

    if (!rawToken || !email) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Invalid verification link parameters.")}`,
          origin
        )
      );
    }

    const tokenHash = hashVerificationSecret(rawToken);
    const record = await prisma.authVerificationToken.findFirst({
      where: {
        tokenHash,
        email,
        consumedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!record) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("This verification link has expired or already been used. Please request a new confirmation email.")}`,
          origin
        )
      );
    }

    const now = new Date();
    await prisma.authVerificationToken.update({
      where: { id: record.id },
      data: { consumedAt: now, verifiedAt: now },
    });

    if (record.pollHash) {
      await prisma.authVerificationToken
        .updateMany({
          where: {
            email,
            pollHash: record.pollHash,
            verifiedAt: null,
          },
          data: { verifiedAt: now },
        })
        .catch(() => {});
    }

    const user = await upsertVerifiedUser({
      email,
      provider: "email",
    });

    const res = NextResponse.redirect(new URL(next, origin));
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    console.error("Email magic-link confirm error:", err);
    const msg =
      err instanceof Error ? err.message : "Email confirmation failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}

