import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { tier, billingCycle } = await req.json();

    if (!["PRO", "MAX"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier specified." }, { status: 400 });
    }

    const periodDays = billingCycle === "YEARLY" ? 365 : 30;

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
      message: `Successfully upgraded to CourseIt ${tier} plan (${billingCycle.toLowerCase()})! Your new build limits are now active.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

