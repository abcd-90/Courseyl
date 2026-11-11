import { NextResponse } from "next/server";
import { getCurrentUser, getRequestOrigin } from "@/lib/auth";
import {
  getMaskedAuthSecretsForAdmin,
  getPublicAuthProvidersStatus,
  saveAuthSecretsForAdmin,
} from "@/lib/auth-providers";
import { validateRealEmailAddress } from "@/lib/email-validation";
import { sendAdminMailerTestEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized access: Administrator role required." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    if (body?.secrets && typeof body.secrets === "object") {
      await saveAuthSecretsForAdmin(body.secrets);
    }

    const targetEmail = String(body?.to || user.email || "").trim().toLowerCase();
    const validation = await validateRealEmailAddress(targetEmail);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Please enter a valid recipient email." },
        { status: 400 }
      );
    }

    const result = await sendAdminMailerTestEmail({
      recipientEmail: validation.cleanEmail,
      origin: getRequestOrigin(req),
    });

    const [authSecrets, authProviders] = await Promise.all([
      getMaskedAuthSecretsForAdmin(),
      getPublicAuthProvidersStatus(),
    ]);

    if (!result.ok) {
      return NextResponse.json(
        {
          error: result.error || result.message,
          authSecrets,
          authProviders,
        },
        { status: result.statusCode || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      mode: result.mode,
      message: result.message,
      authSecrets,
      authProviders,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to run mailer test.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

