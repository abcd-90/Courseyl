import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/settings";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  clampDailyStudyMinutes,
  isValidDailyStudyMinutes,
  MIN_DAILY_STUDY_MINUTES,
  MAX_DAILY_STUDY_MINUTES,
} from "@/lib/pacing";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [settings, user] = await Promise.all([
      getPublicSettings(),
      getCurrentUser().catch(() => null),
    ]);

    if (!user) {
      return NextResponse.json(settings, {
        headers: {
          "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
        },
      });
    }

    const effectiveDisplayName =
      user.profile?.displayName || user.email.split("@")[0];

    return NextResponse.json(
      {
        ...settings,
        userPreferences: {
          displayName: effectiveDisplayName,
          dailyStudyMinutes: clampDailyStudyMinutes(
            user.profile?.dailyStudyMinutes,
            60
          ),
          emailReminders: user.profile?.emailReminders ?? true,
          weeklyDigest: user.profile?.weeklyDigest ?? false,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const rawName = body.displayName ?? body.name ?? body.fullName;
    const newDisplayName =
      rawName !== undefined ? String(rawName).trim() : undefined;
    const rawMinutes =
      body.dailyStudyMinutes ?? body.dailyStudyTime ?? body.dailyTime;

    let validatedMinutes: number | undefined;
    if (rawMinutes !== undefined && rawMinutes !== null && rawMinutes !== "") {
      if (!isValidDailyStudyMinutes(rawMinutes)) {
        return NextResponse.json(
          {
            error: `Daily study duration must be between ${MIN_DAILY_STUDY_MINUTES} and ${MAX_DAILY_STUDY_MINUTES} minutes.`,
          },
          { status: 400 }
        );
      }
      validatedMinutes = clampDailyStudyMinutes(rawMinutes, 60);
    }

    const updateData: Record<string, any> = {};
    if (newDisplayName !== undefined) {
      if (!newDisplayName) {
        return NextResponse.json(
          { error: "Please enter a valid full name." },
          { status: 400 }
        );
      }
      updateData.displayName = newDisplayName;
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

    if (typeof body.bio === "string") {
      updateData.bio = body.bio.trim();
    }
    if (validatedMinutes !== undefined) {
      updateData.dailyStudyMinutes = validatedMinutes;
    }
    if (typeof body.emailReminders === "boolean") {
      updateData.emailReminders = body.emailReminders;
    }
    if (typeof body.weeklyDigest === "boolean") {
      updateData.weeklyDigest = body.weeklyDigest;
    }

    const updatedProfile = await prisma.profile.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        displayName: newDisplayName || user.email.split("@")[0],
        dailyStudyMinutes: validatedMinutes ?? 60,
        emailReminders:
          typeof body.emailReminders === "boolean" ? body.emailReminders : true,
        weeklyDigest:
          typeof body.weeklyDigest === "boolean" ? body.weeklyDigest : false,
        avatarUrl: updateData.avatarUrl,
        bio: typeof body.bio === "string" ? body.bio.trim() : null,
      },
    });

    if (validatedMinutes !== undefined) {
      const todayStr = new Date().toISOString().split("T")[0];
      await prisma.dailyPlan
        .upsert({
          where: {
            userId_planDate: {
              userId: user.id,
              planDate: todayStr,
            },
          },
          update: { targetMinutes: validatedMinutes },
          create: {
            userId: user.id,
            planDate: todayStr,
            targetMinutes: validatedMinutes,
            completedMinutes: 0,
          },
        })
        .catch(() => {});
    }

    const effectiveName = updatedProfile.displayName || user.email.split("@")[0];

    return NextResponse.json({
      success: true,
      message: "Preferences updated successfully",
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        authProvider: user.authProvider,
        name: effectiveName,
        displayName: effectiveName,
        profile: updatedProfile,
        subscription: user.subscription,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving preferences";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export const PUT = PATCH;
