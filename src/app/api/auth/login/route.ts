import crypto from "node:crypto";
import { NextResponse } from "next/server";
import {
  attachPendingVerifyCookie,
  attachSessionCookie,
  getRequestOrigin,
  hashVerificationSecret,
  readPendingVerifyCookie,
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
      const safeNext = sanitizeNextPath(next);
      const pendingCookie = await readPendingVerifyCookie();
      const recentToken = await prisma.authVerificationToken.findFirst({
        where: {
          email: cleanEmail,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          createdAt: { gt: new Date(Date.now() - 60_000) },
        },
        orderBy: { createdAt: "desc" },
        select: { id: true, pollHash: true },
      });

      let pollSecret: string | undefined =
        pendingCookie?.email === cleanEmail ? pendingCookie.pollSecret : undefined;
      let deliveryOk = false;

      if (recentToken) {
        const expectedHash = pollSecret ? hashVerificationSecret(pollSecret) : null;
        if (!expectedHash || recentToken.pollHash !== expectedHash) {
          pollSecret = crypto.randomBytes(32).toString("hex");
          await prisma.authVerificationToken.update({
            where: { id: recentToken.id },
            data: {
              pollHash: hashVerificationSecret(pollSecret),
              nextPath: safeNext,
            },
          });
        }
      } else {
        const delivery = await issueAndSendEmailVerification({
          email: cleanEmail,
          purpose: "VERIFY_EMAIL",
          origin,
          next: safeNext,
          existingPollSecret: pollSecret,
        }).catch(() => null);
        deliveryOk = Boolean(delivery?.ok);
        if (delivery?.pollSecret) {
          pollSecret = delivery.pollSecret;
        }
      }

      const res = NextResponse.json(
        {
          error: recentToken
            ? `A confirmation link was already sent to ${cleanEmail}.`
            : deliveryOk
            ? `Confirmation link sent to ${cleanEmail}.`
            : "Your email is not verified yet. Please check your inbox and confirm your email first.",
          requiresVerification: true,
          email: cleanEmail,
        },
        { status: 403 }
      );

      if (pollSecret) {
        attachPendingVerifyCookie(res, {
          email: cleanEmail,
          pollSecret,
          next: safeNext,
        });
      }

      return res;
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
