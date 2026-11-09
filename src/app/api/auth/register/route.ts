import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, signToken, getAuthCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { email, password, name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (existingUser) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 400 });
    }

    const passwordHash = await hashPassword(password);
    const displayName = name?.trim() || email.split("@")[0];

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        passwordHash,
        role: "USER",
        profile: {
          create: {
            displayName,
            dailyStudyMinutes: 60,
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
          },
        },
      },
      include: {
        profile: true,
        subscription: true,
      },
    });

    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        profile: user.profile,
        subscription: user.subscription,
      },
    });

    const cookieOptions = getAuthCookieOptions();
    res.cookies.set(cookieOptions.name, token, cookieOptions);

    return res;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

