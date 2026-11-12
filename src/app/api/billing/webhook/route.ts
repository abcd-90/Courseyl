import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { verifyStripeWebhookSignature } from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
    if (!webhookSecret) {
      return NextResponse.json(
        { error: "STRIPE_WEBHOOK_SECRET is not configured." },
        { status: 503 }
      );
    }

    const rawBody = await req.text();
    const signatureHeader = req.headers.get("stripe-signature");

    const isValid = verifyStripeWebhookSignature({
      rawBody,
      signatureHeader,
      webhookSecret,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Invalid webhook signature." }, { status: 400 });
    }

    const event = JSON.parse(rawBody);
    const eventType = event?.type as string | undefined;
    const obj = event?.data?.object;

    if (eventType === "checkout.session.completed" && obj) {
      const userId = (obj.metadata?.userId || obj.client_reference_id) as string | undefined;
      const customerEmail = (obj.customer_email || obj.customer_details?.email) as string | undefined;
      const rawTier = String(obj.metadata?.tier || "PRO").toUpperCase();
      const rawCycle = String(obj.metadata?.billingCycle || "MONTHLY").toUpperCase();

      const resolvedTier = rawTier === "MAX" ? "MAX" : "PRO";
      const periodDays = rawCycle === "YEARLY" ? 365 : 30;
      const periodStart = new Date();
      const periodEnd = new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000);

      let targetUserId = userId;
      if (!targetUserId && customerEmail) {
        const matchedUser = await prisma.user.findUnique({
          where: { email: customerEmail.toLowerCase() },
          select: { id: true },
        });
        targetUserId = matchedUser?.id;
      }

      if (targetUserId) {
        await prisma.subscription.upsert({
          where: { userId: targetUserId },
          update: {
            tier: resolvedTier,
            status: "ACTIVE",
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
          create: {
            userId: targetUserId,
            tier: resolvedTier,
            status: "ACTIVE",
            monthlyGenerationsUsed: 0,
            monthlyHoursUsedSeconds: 0,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });

        await createNotification({
          userId: targetUserId,
          title: `${resolvedTier} plan activated`,
          message: `Your ${resolvedTier} subscription (${rawCycle.toLowerCase()}) is now active until ${periodEnd.toLocaleDateString()}.`,
          type: "SYSTEM",
          linkUrl: "/billing",
        });
      }
    } else if (eventType === "customer.subscription.deleted" && obj) {
      const metaUserId = obj.metadata?.userId as string | undefined;
      if (metaUserId) {
        await prisma.subscription.updateMany({
          where: { userId: metaUserId },
          data: {
            tier: "FREE",
            status: "ACTIVE",
          },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Webhook processing error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

