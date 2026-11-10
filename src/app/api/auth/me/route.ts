import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  const effectiveDisplayName =
    user.profile?.displayName || user.email.split("@")[0];

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      name: effectiveDisplayName,
      displayName: effectiveDisplayName,
      profile: user.profile,
      subscription: user.subscription,
    },
  });
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawName = body.displayName ?? body.name ?? body.fullName;
    const newDisplayName = rawName !== undefined ? String(rawName).trim() : undefined;
    const dailyStudyMinutes = Number(body.dailyStudyMinutes ?? body.dailyStudyTime ?? body.dailyTime);
    const bio = body.bio !== undefined ? String(body.bio).trim() : undefined;

    const updateData: any = {};
    if (newDisplayName && newDisplayName.length > 0) {
      updateData.displayName = newDisplayName;
      // Auto-update dicebear avatar seed if using dicebear
      if (
        !body.avatarUrl ||
        body.avatarUrl.includes("dicebear.com") ||
        user.profile?.avatarUrl?.includes("dicebear.com")
      ) {
        updateData.avatarUrl = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          newDisplayName
        )}&backgroundColor=b8c460`;
      }
    }
    if (body.avatarUrl && !body.avatarUrl.includes("dicebear.com")) {
      updateData.avatarUrl = body.avatarUrl;
    }
    if (bio !== undefined) {
      updateData.bio = bio;
    }
    if (!isNaN(dailyStudyMinutes) && dailyStudyMinutes > 0) {
      updateData.dailyStudyMinutes = dailyStudyMinutes;
    }

    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        displayName: newDisplayName || user.email.split("@")[0],
        dailyStudyMinutes: !isNaN(dailyStudyMinutes) && dailyStudyMinutes > 0 ? dailyStudyMinutes : 60,
        avatarUrl: updateData.avatarUrl,
        bio: bio || null,
      },
    });

    if (!isNaN(dailyStudyMinutes) && dailyStudyMinutes > 0) {
      const todayStr = new Date().toISOString().split("T")[0];
      await prisma.dailyPlan
        .upsert({
          where: {
            userId_planDate: {
              userId: user.id,
              planDate: todayStr,
            },
          },
          update: { targetMinutes: dailyStudyMinutes },
          create: {
            userId: user.id,
            planDate: todayStr,
            targetMinutes: dailyStudyMinutes,
            completedMinutes: 0,
          },
        })
        .catch(() => {});
    }

    const effectiveName = updatedProfile.displayName || user.email.split("@")[0];

    const fullUser = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: effectiveName,
      displayName: effectiveName,
      profile: updatedProfile,
      subscription: user.subscription,
    };

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: fullUser,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const PUT = PATCH;


