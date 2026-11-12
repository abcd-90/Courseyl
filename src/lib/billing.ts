import crypto from "crypto";
import { getFullSettings } from "@/lib/settings";

export type PaidTier = "PRO" | "MAX";
export type BillingInterval = "MONTHLY" | "YEARLY";

const STRIPE_API_BASE = "https://api.stripe.com/v1";

export function isBillingConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

export function isLiveBillingKey(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim().startsWith("sk_live_"));
}

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  return key;
}

export function resolveSiteOrigin(req: Request): string {
  const envOrigin = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (envOrigin) return envOrigin.replace(/\/+$/, "");

  const originHeader = req.headers.get("origin");
  if (originHeader) return originHeader.replace(/\/+$/, "");

  const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const proto = req.headers.get("x-forwarded-proto") || (host?.includes("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;

  return "http://localhost:3000";
}

function resolveConfiguredPriceId(tier: PaidTier, interval: BillingInterval): string | null {
  const envMap: Record<string, string | undefined> = {
    PRO_MONTHLY: process.env.STRIPE_PRO_MONTHLY_PRICE_ID,
    PRO_YEARLY: process.env.STRIPE_PRO_YEARLY_PRICE_ID,
    MAX_MONTHLY: process.env.STRIPE_MAX_MONTHLY_PRICE_ID,
    MAX_YEARLY: process.env.STRIPE_MAX_YEARLY_PRICE_ID,
  };
  return envMap[`${tier}_${interval}`]?.trim() || null;
}

export async function createStripeCheckoutSession(params: {
  userId: string;
  userEmail: string;
  tier: PaidTier;
  interval: BillingInterval;
  origin: string;
}) {
  const secretKey = getStripeSecretKey();
  const { userId, userEmail, tier, interval, origin } = params;

  const settings = await getFullSettings().catch(() => null);
  const brandName = settings?.branding?.brandName || "Courseyl";
  const planName =
    tier === "PRO"
      ? settings?.plans?.proPlanName || "Pro"
      : settings?.plans?.maxPlanName || "Max";

  const proMonthly = settings?.plans?.proPriceMonthly ?? 19;
  const proYearlyMonthly = settings?.plans?.proPriceYearly ?? Math.max(1, Math.round(proMonthly * 0.8));
  const maxMonthly = settings?.plans?.maxPriceMonthly ?? 49;
  const maxYearlyMonthly = settings?.plans?.maxPriceYearly ?? Math.max(1, Math.round(maxMonthly * 0.8));

  const unitAmountDollars =
    tier === "PRO"
      ? interval === "YEARLY"
        ? proYearlyMonthly * 12
        : proMonthly
      : interval === "YEARLY"
      ? maxYearlyMonthly * 12
      : maxMonthly;

  const form = new URLSearchParams();
  form.set("mode", "subscription");
  form.set("success_url", `${origin}/billing?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  form.set("cancel_url", `${origin}/pricing?checkout=canceled`);
  form.set("client_reference_id", userId);
  form.set("customer_email", userEmail);
  form.set("metadata[userId]", userId);
  form.set("metadata[tier]", tier);
  form.set("metadata[billingCycle]", interval);
  form.set("subscription_data[metadata][userId]", userId);
  form.set("subscription_data[metadata][tier]", tier);
  form.set("subscription_data[metadata][billingCycle]", interval);

  const configuredPriceId = resolveConfiguredPriceId(tier, interval);
  if (configuredPriceId) {
    form.set("line_items[0][price]", configuredPriceId);
    form.set("line_items[0][quantity]", "1");
  } else {
    form.set("line_items[0][price_data][currency]", "usd");
    form.set("line_items[0][price_data][unit_amount]", String(Math.round(unitAmountDollars * 100)));
    form.set(
      "line_items[0][price_data][recurring][interval]",
      interval === "YEARLY" ? "year" : "month"
    );
    form.set(
      "line_items[0][price_data][product_data][name]",
      `${brandName} ${planName} (${interval === "YEARLY" ? "Yearly" : "Monthly"})`
    );
    form.set("line_items[0][quantity]", "1");
  }

  const res = await fetch(`${STRIPE_API_BASE}/checkout/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
  });

  const payload = await res.json();
  if (!res.ok) {
    throw new Error(payload?.error?.message || "Stripe Checkout Session creation failed.");
  }

  return {
    id: payload.id as string,
    url: payload.url as string,
    mode: isLiveBillingKey() ? ("live" as const) : ("test" as const),
  };
}

export async function createStripePortalSession(params: {
  userEmail: string;
  returnUrl: string;
}) {
  const secretKey = getStripeSecretKey();
  const { userEmail, returnUrl } = params;

  const lookupRes = await fetch(
    `${STRIPE_API_BASE}/customers?email=${encodeURIComponent(userEmail)}&limit=1`,
    {
      headers: {
        Authorization: `Bearer ${secretKey}`,
      },
    }
  );
  const lookupData = await lookupRes.json();
  if (!lookupRes.ok) {
    throw new Error(lookupData?.error?.message || "Failed to look up billing customer.");
  }

  let customerId: string | undefined = lookupData?.data?.[0]?.id;
  if (!customerId) {
    const createCustForm = new URLSearchParams();
    createCustForm.set("email", userEmail);
    const createCustRes = await fetch(`${STRIPE_API_BASE}/customers`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: createCustForm.toString(),
    });
    const createdCust = await createCustRes.json();
    if (!createCustRes.ok || !createdCust?.id) {
      throw new Error(createdCust?.error?.message || "Failed to initialize billing profile.");
    }
    customerId = createdCust.id;
  }

  const portalForm = new URLSearchParams();
  portalForm.set("customer", customerId!);
  portalForm.set("return_url", returnUrl);

  const portalRes = await fetch(`${STRIPE_API_BASE}/billing_portal/sessions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: portalForm.toString(),
  });
  const portalData = await portalRes.json();
  if (!portalRes.ok || !portalData?.url) {
    throw new Error(
      portalData?.error?.message || "Failed to create Stripe Customer Portal session."
    );
  }

  return {
    url: portalData.url as string,
    customerId: customerId!,
  };
}

export function verifyStripeWebhookSignature(params: {
  rawBody: string;
  signatureHeader: string | null;
  webhookSecret: string;
  toleranceSeconds?: number;
}): boolean {
  const { rawBody, signatureHeader, webhookSecret, toleranceSeconds = 300 } = params;
  if (!signatureHeader || !webhookSecret) return false;

  const parts = signatureHeader.split(",").map((p) => p.trim());
  const timestampPart = parts.find((p) => p.startsWith("t="));
  const v1Signatures = parts
    .filter((p) => p.startsWith("v1="))
    .map((p) => p.slice(3))
    .filter(Boolean);

  if (!timestampPart || v1Signatures.length === 0) return false;

  const timestamp = Number(timestampPart.slice(2));
  if (!Number.isFinite(timestamp)) return false;

  const ageSeconds = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
  if (ageSeconds > toleranceSeconds) return false;

  const signedPayload = `${timestamp}.${rawBody}`;
  const expectedSig = crypto
    .createHmac("sha256", webhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const expectedBuf = Buffer.from(expectedSig, "utf8");
  return v1Signatures.some((sig) => {
    const candidateBuf = Buffer.from(sig, "utf8");
    if (candidateBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(candidateBuf, expectedBuf);
  });
}

