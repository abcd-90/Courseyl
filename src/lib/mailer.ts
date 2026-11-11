import crypto from "crypto";
import nodemailer from "nodemailer";
import { hashVerificationSecret, sanitizeNextPath } from "./auth";
import { getEffectiveAuthConfig } from "./auth-providers";
import { prisma } from "./db";
import { getPublicSettings } from "./settings";
import { createServerSupabaseAuthClient } from "./supabaseClient";

export type VerificationPurpose = "LOGIN_OTP" | "VERIFY_EMAIL" | "RESET_PASSWORD";

export interface SendVerificationResult {
  ok: boolean;
  mode: "resend" | "smtp" | "supabase";
  message: string;
  error?: string;
  statusCode?: number;
}

function renderVerificationHtml(params: {
  brandName: string;
  code: string;
  confirmUrl: string;
  purpose: VerificationPurpose;
}) {
  const actionHeading =
    params.purpose === "VERIFY_EMAIL"
      ? `Verify your email for ${params.brandName}`
      : `Sign in to ${params.brandName}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${actionHeading}</title>
</head>
<body style="margin: 0; padding: 24px 12px; background: #f6f8ec; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; color: #0f1611;">
  <div style="max-width: 500px; margin: 0 auto; padding: 28px 24px; background: #ffffff; border: 1px solid #e4e9c6; border-radius: 16px;">
    <p style="font-size: 13px; color: #4b5e1e; font-weight: 600; margin: 0 0 8px;">
      ${params.brandName} Account Verification
    </p>
    <h1 style="font-size: 22px; font-weight: 700; margin: 0 0 12px; color: #0f1611;">${actionHeading}</h1>
    <p style="font-size: 15px; line-height: 1.55; color: #4c4c3d; margin: 0 0 22px;">
      ${
        params.purpose === "VERIFY_EMAIL"
          ? `Click the button below to confirm your email address. You will be signed in straight to your ${params.brandName} dashboard, and you can use your email and password to sign in anytime after.`
          : `Click the button below to sign in to ${params.brandName}, or enter the 6-digit verification code if prompted. This verification stays valid for 10 minutes.`
      }
    </p>
    <p style="text-align: center; margin: 0 0 22px;">
      <a href="${params.confirmUrl}" style="display: inline-block; background: #4b5e1e; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 15px; padding: 13px 28px; border-radius: 999px;">
        Verify Email &amp; Go to Dashboard →
      </a>
    </p>
    <div style="background: #f6f8ec; border: 1px solid #d5df88; border-radius: 12px; padding: 14px; text-align: center; margin-bottom: 18px;">
      <p style="font-size: 11px; color: #4c4c3d; margin: 0 0 6px;">Or enter this 6-digit code manually:</p>
      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 24px; font-weight: 700; letter-spacing: 5px; color: #0f1611;">
        ${params.code}
      </span>
    </div>
    <p style="font-size: 12px; line-height: 1.5; color: #666656; margin: 0;">
      If you did not try to sign in to ${params.brandName}, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`;
}

function renderVerificationText(params: {
  brandName: string;
  code: string;
  confirmUrl: string;
}) {
  return [
    `${params.brandName} — Email Verification`,
    "",
    `Your 6-digit verification code is: ${params.code}`,
    "",
    "Enter this code on the login page (expires in 10 minutes), or open the link below to sign in directly:",
    params.confirmUrl,
    "",
    `If you didn't request this email, you can ignore it.`,
  ].join("\n");
}

async function deliverViaConfiguredMailer(params: {
  cfg: Awaited<ReturnType<typeof getEffectiveAuthConfig>>;
  brandName: string;
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<SendVerificationResult | null> {
  const { cfg, brandName, to, subject, html, text } = params;
  const hasResend = Boolean(cfg.resendApiKey);
  const hasSmtp = Boolean(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);

  if (hasResend) {
    const fromAddr = cfg.smtpFrom || `${brandName} <onboarding@resend.dev>`;
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${cfg.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddr,
        to: [to],
        reply_to: cfg.smtpUser || undefined,
        subject,
        html,
        text,
      }),
    });

    if (!resendRes.ok) {
      const errJson = await resendRes.json().catch(() => ({}));
      return {
        ok: false,
        mode: "resend",
        statusCode: resendRes.status || 502,
        message: "Failed to deliver verification email via Resend.",
        error:
          errJson?.message ||
          "Resend rejected this email request. Check your RESEND_API_KEY and verified sender domain.",
      };
    }

    return {
      ok: true,
      mode: "resend",
      message: `Confirmation link & 6-digit code sent to ${to}.`,
    };
  }

  if (hasSmtp) {
    try {
      const normalizedPass = cfg.smtpHost.toLowerCase().includes("gmail.com")
        ? cfg.smtpPass.replace(/\s+/g, "")
        : cfg.smtpPass;
      const port = cfg.smtpPort || 587;
      const transporter = nodemailer.createTransport({
        host: cfg.smtpHost,
        port,
        secure: port === 465,
        auth: {
          user: cfg.smtpUser,
          pass: normalizedPass,
        },
      });

      await transporter.sendMail({
        from: cfg.smtpFrom || `${brandName} <${cfg.smtpUser}>`,
        replyTo: cfg.smtpUser || undefined,
        to,
        subject,
        text,
        html,
      });

      return {
        ok: true,
        mode: "smtp",
        message: `Confirmation link & 6-digit code sent to ${to}.`,
      };
    } catch (smtpErr: unknown) {
      console.error("SMTP sendMail failed:", smtpErr);
      const errMsg =
        smtpErr instanceof Error
          ? smtpErr.message
          : "SMTP authentication or delivery error";
      return {
        ok: false,
        mode: "smtp",
        statusCode: 502,
        message: "Failed to send confirmation email via SMTP.",
        error: `Email delivery error: ${errMsg}`,
      };
    }
  }

  return null;
}

/**
 * Generates and sends a genuine email verification code + magic link.
 * Priority: Resend API -> Direct SMTP (Nodemailer) -> Supabase Auth OTP/Magic Link.
 */
export async function issueAndSendEmailVerification(params: {
  email: string;
  purpose: VerificationPurpose;
  origin: string;
  next?: string;
}): Promise<SendVerificationResult> {
  const cleanEmail = params.email.trim().toLowerCase();
  const safeNext = sanitizeNextPath(params.next);
  const [cfg, publicSettings] = await Promise.all([
    getEffectiveAuthConfig(),
    getPublicSettings().catch(() => null),
  ]);
  const brandName = publicSettings?.branding?.brandName || "Courseyl";

  const hasResend = Boolean(cfg.resendApiKey);
  const hasSmtp = Boolean(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);

  if (hasResend || hasSmtp) {
    // Invalidate older unconsumed codes for this email & purpose
    await prisma.authVerificationToken.updateMany({
      where: {
        email: cleanEmail,
        purpose: params.purpose,
        consumedAt: null,
      },
      data: { consumedAt: new Date() },
    });

    const code = String(crypto.randomInt(100000, 1000000));
    const rawToken = crypto.randomBytes(32).toString("hex");

    await prisma.authVerificationToken.create({
      data: {
        email: cleanEmail,
        purpose: params.purpose,
        codeHash: hashVerificationSecret(code),
        tokenHash: hashVerificationSecret(rawToken),
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    const confirmUrl = `${params.origin}/api/auth/email/confirm?token=${encodeURIComponent(
      rawToken
    )}&email=${encodeURIComponent(cleanEmail)}&next=${encodeURIComponent(safeNext)}`;

    const subject =
      params.purpose === "VERIFY_EMAIL"
        ? `Confirm your email for ${brandName}`
        : `${code} is your ${brandName} sign-in code`;

    const html = renderVerificationHtml({
      brandName,
      code,
      confirmUrl,
      purpose: params.purpose,
    });
    const text = renderVerificationText({
      brandName,
      code,
      confirmUrl,
    });

    const delivered = await deliverViaConfiguredMailer({
      cfg,
      brandName,
      to: cleanEmail,
      subject,
      html,
      text,
    });
    if (delivered) {
      return delivered;
    }
  }

  // Fallback: Genuine Supabase Auth Confirmation Email (Magic Link + Email OTP)
  const sb = createServerSupabaseAuthClient();
  const redirectTarget = `${params.origin}/auth/callback?next=${encodeURIComponent(
    safeNext
  )}`;

  const { error: otpError } = await sb.auth.signInWithOtp({
    email: cleanEmail,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: redirectTarget,
    },
  });

  if (otpError) {
    const rawMsg = otpError.message || "Email verification service failed.";
    const status = otpError.status || 429;
    let helpfulMsg = rawMsg;

    if (
      rawMsg.toLowerCase().includes("rate limit") ||
      status === 429
    ) {
      helpfulMsg =
        "Supabase default mailer rate limit reached. Wait 60 seconds or configure Custom SMTP / RESEND_API_KEY in Admin Studio → Security for unlimited confirmation emails.";
    } else if (
      rawMsg.toLowerCase().includes("not authorized") ||
      rawMsg.toLowerCase().includes("confirmation email")
    ) {
      helpfulMsg =
        "Supabase default mailer only permits project team emails without Custom SMTP. Add SMTP (e.g. Gmail App Password) or RESEND_API_KEY in Admin Studio → Security or Vercel env.";
    }

    return {
      ok: false,
      mode: "supabase",
      statusCode: status >= 400 ? status : 502,
      message: "Confirmation email could not be dispatched.",
      error: helpfulMsg,
    };
  }

  return {
    ok: true,
    mode: "supabase",
    message: `Confirmation email sent to ${cleanEmail}. Click the confirmation link in your inbox or enter your 6-digit code below.`,
  };
}

/**
 * Admin-only diagnostic helper to verify Resend API or Custom SMTP delivery directly
 * without touching Supabase's default shared mailer.
 */
export async function sendAdminMailerTestEmail(params: {
  recipientEmail: string;
  origin: string;
}): Promise<SendVerificationResult> {
  const to = params.recipientEmail.trim().toLowerCase();
  const [cfg, publicSettings] = await Promise.all([
    getEffectiveAuthConfig(),
    getPublicSettings().catch(() => null),
  ]);
  const brandName = publicSettings?.branding?.brandName || "Courseyl";

  const hasCustom = Boolean(
    cfg.resendApiKey || (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass)
  );
  if (!hasCustom) {
    return {
      ok: false,
      mode: "supabase",
      statusCode: 400,
      message: "Custom mailer not configured yet.",
      error:
        "Save either a Resend API Key or Gmail/Custom SMTP credentials first, then click Send Test Email.",
    };
  }

  const testCode = String(crypto.randomInt(100000, 1000000));
  const confirmUrl = `${params.origin}/login`;
  const html = renderVerificationHtml({
    brandName,
    code: testCode,
    confirmUrl,
    purpose: "VERIFY_EMAIL",
  });
  const text = renderVerificationText({
    brandName,
    code: testCode,
    confirmUrl,
  });

  const result = await deliverViaConfiguredMailer({
    cfg,
    brandName,
    to,
    subject: `${testCode} is your ${brandName} verification code`,
    html,
    text,
  });

  if (!result) {
    return {
      ok: false,
      mode: "smtp",
      statusCode: 400,
      message: "Custom mailer not configured.",
      error: "No Resend or SMTP credentials active.",
    };
  }

  return result.ok
    ? {
        ...result,
        message: `Test email delivered successfully via ${result.mode.toUpperCase()} to ${to}!`,
      }
    : result;
}

