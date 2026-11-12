import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getFullSettings } from "@/lib/settings";
import { isBillingConfigured } from "@/lib/billing";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sub = user.subscription || {
      id: "free-sub",
      tier: "FREE",
      status: "ACTIVE",
      monthlyGenerationsUsed: 0,
      monthlyHoursUsedSeconds: 0,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    const siteSettings = await getFullSettings().catch(() => null);
    const plans = siteSettings?.plans;
    const isUnlimited = plans?.unlimitedFreeMode === true;

    const freeH = plans?.freeHoursLimit && plans.freeHoursLimit < 999 ? plans.freeHoursLimit : 5;
    const freeG = plans?.freeGenerationsLimit && plans.freeGenerationsLimit < 999 ? plans.freeGenerationsLimit : 5;
    const proH = plans?.proHoursLimit || 20;
    const proG = plans?.proGenerationsLimit || 25;
    const maxH = plans?.maxHoursLimit || 40;
    const maxG = plans?.maxGenerationsLimit || 100;
    const proM = plans?.proPriceMonthly ?? 19;
    const proY = plans?.proPriceYearly ?? Math.max(1, Math.round(proM * 0.8));
    const maxM = plans?.maxPriceMonthly ?? 49;
    const maxY = plans?.maxPriceYearly ?? Math.max(1, Math.round(maxM * 0.8));

    const tierLimits = {
      FREE: {
        name: plans?.freePlanName || "Free",
        priceMonthly: 0,
        priceYearly: 0,
        maxCoursesPerMonth: isUnlimited ? 9999 : freeG,
        maxHoursPerCourse: isUnlimited ? 9999 : freeH,
        maxTotalHoursMonth: isUnlimited ? 9999 : freeH,
        priority: "Standard",
        canRetry: isUnlimited,
      },
      PRO: {
        name: plans?.proPlanName || "Pro",
        priceMonthly: proM,
        priceYearly: proY * 12,
        maxCoursesPerMonth: isUnlimited ? 9999 : proG,
        maxHoursPerCourse: isUnlimited ? 9999 : proH,
        maxTotalHoursMonth: isUnlimited ? 9999 : proH,
        priority: "High",
        canRetry: true,
      },
      MAX: {
        name: plans?.maxPlanName || "Max",
        priceMonthly: maxM,
        priceYearly: maxY * 12,
        maxCoursesPerMonth: isUnlimited ? 9999 : maxG,
        maxHoursPerCourse: isUnlimited ? 9999 : maxH,
        maxTotalHoursMonth: isUnlimited ? 9999 : maxH,
        priority: "Top",
        canRetry: true,
      },
    };

    const currentLimits = tierLimits[sub.tier as keyof typeof tierLimits] || tierLimits.FREE;

    return NextResponse.json({
      unlimitedFreeMode: isUnlimited,
      paymentGatewayConfigured: isBillingConfigured(),
      subscription: {
        id: sub.id,
        tier: sub.tier,
        status: sub.status,
        monthlyGenerationsUsed: sub.monthlyGenerationsUsed,
        monthlyHoursUsed: Math.round((sub.monthlyHoursUsedSeconds / 3600) * 10) / 10,
        currentPeriodStart: sub.currentPeriodStart,
        currentPeriodEnd: sub.currentPeriodEnd,
      },
      limits: currentLimits,
      allPlans: tierLimits,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

