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
      : `Your ${params.brandName} sign-in code`;

  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 32px 24px; background: #fcfcfa; color: #0f1611; border: 1px solid #e4e9c6; border-radius: 20px;">
    <p style="font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: #4b5e1e; font-weight: 700; margin: 0 0 10px;">
      ${params.brandName} Security Verification
    </p>
    <h1 style="font-size: 24px; margin: 0 0 12px; color: #0f1611;">${actionHeading}</h1>
    <p style="font-size: 15px; line-height: 1.6; color: #4c4c3d; margin: 0 0 22px;">
      Enter this 6-digit verification code on the login page, or click the confirmation button below. This code expires in 10 minutes.
    </p>
    <div style="background: #eef2da; border: 1px solid #b8c460; border-radius: 14px; padding: 18px; text-align: center; margin-bottom: 24px;">
      <span style="font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0f1611;">
        ${params.code}
      </span>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${params.confirmUrl}" style="display: inline-block; background: #4b5e1e; color: #f6f8ec; text-decoration: none; font-weight: 600; font-size: 14px; padding: 12px 26px; border-radius: 999px;">
        Confirm Email &amp; Sign In →
      </a>
    </div>
    <p style="font-size: 12px; color: #4c4c3d; margin: 0;">
      If you did not request this verification email, you can safely ignore it.
    </p>
  </div>`;
}

async function deliverViaConfiguredMailer(params: {
  cfg: Awaited<ReturnType<typeof getEffectiveAuthConfig>>;
  brandName: string;
  to: string;
  subject: string;
  html: string;
}): Promise<SendVerificationResult | null> {
  const { cfg, brandName, to, subject, html } = params;
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
        subject,
        html,
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
        to,
        subject,
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
        ? `Confirm your email for ${brandName} (${code})`
        : `${code} is your ${brandName} sign-in code`;

    const html = renderVerificationHtml({
      brandName,
      code,
      confirmUrl,
      purpose: params.purpose,
    });

    const delivered = await deliverViaConfiguredMailer({
      cfg,
      brandName,
      to: cleanEmail,
      subject,
      html,
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

  const html = renderVerificationHtml({
    brandName,
    code: "123456",
    confirmUrl: `${params.origin}/login`,
    purpose: "VERIFY_EMAIL",
  });

  const result = await deliverViaConfiguredMailer({
    cfg,
    brandName,
    to,
    subject: `${brandName} Custom Mailer Test (Success)`,
    html,
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

