import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, getAuthCookieOptions, hashPassword } from "@/lib/auth";
import { getPublicSettings } from "@/lib/settings";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email address format." },
        { status: 400 }
      );
    }

    // 1. Check if user already exists
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true, subscription: true },
    });

    let isNew = false;

    if (!user) {
      const settings = await getPublicSettings().catch(() => null);
      if (settings && settings.plans.allowNewSignups === false) {
        return NextResponse.json(
          { error: "New registrations are temporarily paused by administrator." },
          { status: 403 }
        );
      }

      isNew = true;
      const defaultName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
      const formattedName =
        defaultName.charAt(0).toUpperCase() + defaultName.slice(1);
      const randomSecret = Math.random().toString(36).slice(2) + Date.now();
      const passwordHash = await hashPassword(randomSecret);

      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          role: "USER",
          profile: {
            create: {
              displayName: formattedName,
              avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
                formattedName
              )}&backgroundColor=b8c460`,
              dailyStudyMinutes: 30,
              currentStreakDays: 1,
              lastStudyDate: new Date(),
            },
          },
          subscription: {
            create: {
              tier: "FREE",
              status: "ACTIVE",
              monthlyGenerationsUsed: 0,
              monthlyHoursUsedSeconds: 0,
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          },
        },
        include: { profile: true, subscription: true },
      });
    }

    // 2. Sign JWT Session Token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 3. Set secure HTTP-only cookie
    const cookieOpts = getAuthCookieOptions();
    const response = NextResponse.json({
      success: true,
      isNew,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        subscription: user.subscription,
      },
    });

    response.cookies.set(cookieOpts.name, token, cookieOpts);

    return response;
  } catch (err: unknown) {
    console.error("Email login error:", err);
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

