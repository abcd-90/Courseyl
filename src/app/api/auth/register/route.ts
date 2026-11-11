import { NextResponse } from "next/server";
import {
  attachPendingVerifyCookie,
  getRequestOrigin,
  hashPassword,
  readPendingVerifyCookie,
  sanitizeNextPath,
} from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateRealEmailAddress } from "@/lib/email-validation";
import { issueAndSendEmailVerification } from "@/lib/mailer";
import { getPublicSettings } from "@/lib/settings";

/**
 * POST /api/auth/register
 * Creates an unverified account with hashed password and sends a mandatory email confirmation code/link.
 * Does NOT sign an active session cookie until the user proves ownership of the inbox.
 */
export async function POST(req: Request) {
  try {
    const settings = await getPublicSettings().catch(() => null);
    if (settings && settings.plans.allowNewSignups === false) {
      return NextResponse.json(
        {
          error:
            "New registrations are temporarily paused by administrator.",
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, name, next } = body;

    const validation = await validateRealEmailAddress(email);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    const cleanEmail = validation.cleanEmail;
    const passwordHash = await hashPassword(password);
    const fallbackName = cleanEmail.split("@")[0];
    const displayName =
      typeof name === "string" && name.trim().length > 0
        ? name.trim()
        : fallbackName;

    const existingUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true, subscription: true },
    });

    if (existingUser?.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in." },
        { status: 409 }
      );
    }

    if (existingUser && !existingUser.emailVerified) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { passwordHash },
      });
      if (displayName && existingUser.profile) {
        await prisma.profile.update({
          where: { userId: existingUser.id },
          data: { displayName },
        });
      }
    } else {
      await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: "USER",
          emailVerified: false,
          authProvider: "email",
          profile: {
            create: {
              displayName,
              avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                displayName
              )}&backgroundColor=b8c460`,
              dailyStudyMinutes: 60,
              currentStreakDays: 1,
              lastStudyDate: new Date(),
            },
          },
          subscription: {
            create: {
              tier: "FREE",
              status: "ACTIVE",
              monthlyGenerationsUsed: 0,
              monthlyHoursUsedSeconds: 0,
            },
          },
        },
      });
    }

    const origin = getRequestOrigin(req);
    const safeNext = sanitizeNextPath(next);
    const pendingCookie = await readPendingVerifyCookie();

    const delivery = await issueAndSendEmailVerification({
      email: cleanEmail,
      purpose: "VERIFY_EMAIL",
      origin,
      next: safeNext,
      existingPollSecret:
        pendingCookie?.email === cleanEmail ? pendingCookie.pollSecret : undefined,
    });

    if (!delivery.ok) {
      return NextResponse.json(
        {
          error:
            delivery.error ||
            "Account created, but confirmation email could not be sent.",
          requiresVerification: true,
        },
        { status: delivery.statusCode || 502 }
      );
    }

    const res = NextResponse.json({
      success: true,
      requiresVerification: true,
      deliveryMode: delivery.mode,
      email: cleanEmail,
      message: delivery.message,
    });

    if (delivery.pollSecret) {
      attachPendingVerifyCookie(res, {
        email: cleanEmail,
        pollSecret: delivery.pollSecret,
        next: safeNext,
      });
    }

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
