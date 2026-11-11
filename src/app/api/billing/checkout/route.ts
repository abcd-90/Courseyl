import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFullSettings } from "@/lib/settings";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier, billingCycle, interval } = await req.json();
    const resolvedCycle = (billingCycle || interval || "monthly").toString().toUpperCase();

    if (!["PRO", "MAX"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier specified." }, { status: 400 });
    }

    const settings = await getFullSettings().catch(() => null);
    const brandName = settings?.branding?.brandName || "Courseyl";
    const planLabel =
      tier === "PRO"
        ? settings?.plans?.proPlanName || "Pro"
        : settings?.plans?.maxPlanName || "Max";

    const periodDays = resolvedCycle === "YEARLY" ? 365 : 30;

    const updatedSub = await prisma.subscription.upsert({
      where: { userId: user.id },
      update: {
        tier,
        status: "ACTIVE",
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      },
      create: {
        userId: user.id,
        tier,
        status: "ACTIVE",
        monthlyGenerationsUsed: 0,
        monthlyHoursUsedSeconds: 0,
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + periodDays * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSub,
      message: `Successfully upgraded to ${brandName} ${planLabel} plan (${resolvedCycle.toLowerCase()})! Your new build limits are now active.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

