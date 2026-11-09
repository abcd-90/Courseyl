import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, getAuthCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { email, name, avatarUrl, credential } = body;

    // If Google ID token credential is provided, decode payload
    if (credential && typeof credential === "string") {
      try {
        const parts = credential.split(".");
        if (parts.length === 3) {
          const payloadJson = Buffer.from(parts[1], "base64").toString("utf-8");
          const payload = JSON.parse(payloadJson);
          if (payload.email) {
            email = payload.email;
            name = name || payload.name || payload.given_name || email.split("@")[0];
            avatarUrl = avatarUrl || payload.picture;
          }
        }
      } catch (err) {
        console.warn("Failed to decode Google JWT token:", err);
      }
    }

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Valid Google email address is required." }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();
    const cleanName = (name || cleanEmail.split("@")[0]).trim();

    // Find or create user
    let user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true, subscription: true },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash: "google_oauth_authenticated",
          role: "USER",
          profile: {
            create: {
              displayName: cleanName,
              avatarUrl: avatarUrl || undefined,
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
        include: { profile: true, subscription: true },
      });
    } else if (avatarUrl && !user.profile?.avatarUrl) {
      // Update avatar if not set
      await prisma.profile.update({
        where: { userId: user.id },
        data: { avatarUrl },
      });
    }

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

