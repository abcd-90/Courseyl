import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getFullSettings } from "@/lib/settings";
import {
  BillingInterval,
  createStripeCheckoutSession,
  isBillingConfigured,
  PaidTier,
  resolveSiteOrigin,
} from "@/lib/billing";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawTier = String(body?.tier || "").toUpperCase();
    const rawCycle = String(body?.billingCycle || body?.interval || "MONTHLY").toUpperCase();

    if (rawTier !== "PRO" && rawTier !== "MAX") {
      return NextResponse.json({ error: "Invalid tier specified." }, { status: 400 });
    }

    const tier = rawTier as PaidTier;
    const interval: BillingInterval = rawCycle === "YEARLY" ? "YEARLY" : "MONTHLY";

    const settings = await getFullSettings().catch(() => null);
    const brandName = settings?.branding?.brandName || "Courseyl";
    const planLabel =
      tier === "PRO"
        ? settings?.plans?.proPlanName || "Pro"
        : settings?.plans?.maxPlanName || "Max";

    if (!isBillingConfigured()) {
      return NextResponse.json(
        {
          configured: false,
          code: "PAYMENT_GATEWAY_NOT_CONFIGURED",
          error: `Live payment checkout is unavailable in this environment (STRIPE_SECRET_KEY is not configured). ${brandName} ${planLabel} upgrades require payment gateway verification before activation.`,
          fallbackUrl: "/billing",
        },
        { status: 503 }
      );
    }

    const origin = resolveSiteOrigin(req);
    const session = await createStripeCheckoutSession({
      userId: user.id,
      userEmail: user.email,
      tier,
      interval,
      origin,
    });

    return NextResponse.json({
      success: true,
      configured: true,
      provider: "stripe",
      mode: session.mode,
      sessionId: session.id,
      checkoutUrl: session.url,
      message: `Redirecting to ${brandName} ${planLabel} (${interval.toLowerCase()}) secure checkout...`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
