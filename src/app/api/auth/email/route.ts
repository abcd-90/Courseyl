import { NextResponse } from "next/server";
import { getRequestOrigin, sanitizeNextPath } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { validateRealEmailAddress } from "@/lib/email-validation";
import { issueAndSendEmailVerification } from "@/lib/mailer";
import { getPublicSettings } from "@/lib/settings";

/**
 * POST /api/auth/email
 * Production-grade passwordless email initiation:
 * Validates domain/MX records and dispatches a genuine verification link + OTP code.
 * NEVER creates an authenticated session before email ownership is confirmed.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validation = await validateRealEmailAddress(body?.email);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = validation.cleanEmail;
    const next = sanitizeNextPath(body?.next);
    const origin = getRequestOrigin(req);

    // Check signup toggle only if user doesn't already exist
    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true },
    });

    if (!existing) {
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
    }

    const purpose =
      body?.purpose === "VERIFY_EMAIL" ? "VERIFY_EMAIL" : "LOGIN_OTP";

    const delivery = await issueAndSendEmailVerification({
      email: cleanEmail,
      purpose,
      origin,
      next,
    });

    if (!delivery.ok) {
      return NextResponse.json(
        { error: delivery.error || delivery.message },
        { status: delivery.statusCode || 502 }
      );
    }

    return NextResponse.json({
      success: true,
      requiresVerification: true,
      deliveryMode: delivery.mode,
      email: cleanEmail,
      message: delivery.message,
    });
  } catch (err: unknown) {
    console.error("Email verification initiation error:", err);
    const msg =
      err instanceof Error ? err.message : "Failed to send verification email.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
