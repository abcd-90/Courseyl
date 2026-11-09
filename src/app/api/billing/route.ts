import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

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

    const tierLimits = {
      FREE: {
        name: "Free",
        priceMonthly: 0,
        priceYearly: 0,
        maxCoursesPerMonth: 1,
        maxHoursPerCourse: 6,
        maxTotalHoursMonth: 6,
        priority: "Standard",
        canRetry: false,
      },
      PRO: {
        name: "Pro",
        priceMonthly: 19,
        priceYearly: 190,
        maxCoursesPerMonth: 5,
        maxHoursPerCourse: 10,
        maxTotalHoursMonth: 30,
        priority: "High",
        canRetry: true,
      },
      MAX: {
        name: "Max",
        priceMonthly: 49,
        priceYearly: 490,
        maxCoursesPerMonth: 20,
        maxHoursPerCourse: 20,
        maxTotalHoursMonth: 100,
        priority: "Top",
        canRetry: true,
      },
    };

    const currentLimits = tierLimits[sub.tier as keyof typeof tierLimits] || tierLimits.FREE;

    return NextResponse.json({
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

