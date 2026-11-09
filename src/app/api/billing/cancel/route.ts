import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.subscription) {
      return NextResponse.json({ error: "No active subscription found." }, { status: 400 });
    }

    const updatedSub = await prisma.subscription.update({
      where: { id: user.subscription.id },
      data: {
        tier: "FREE",
        status: "ACTIVE",
      },
    });

    return NextResponse.json({
      success: true,
      subscription: updatedSub,
      message: "Subscription reverted to Free plan.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

