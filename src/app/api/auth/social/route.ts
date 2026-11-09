import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, getAuthCookieOptions } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let { provider, email, name, avatarUrl } = body;

    const authProvider = provider || "Google";

    // Fallback email generator if social provider doesn't give public email
    if (!email) {
      const sanitizedName = (name || "user").toLowerCase().replace(/[^a-z0-9]/g, "");
      email = `${sanitizedName}.${Date.now().toString(36)}@${authProvider.toLowerCase()}.courseit.xyz`;
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
          passwordHash: `${authProvider.toLowerCase()}_oauth_authenticated`,
          role: "USER",
          profile: {
            create: {
              displayName: cleanName,
              avatarUrl:
                avatarUrl ||
                `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(cleanName)}&backgroundColor=b8c460`,
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
    }

    // Generate JWT token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const response = NextResponse.json(
      {
        message: `${authProvider} login successful`,
        user: {
          id: user.id,
          email: user.email,
          name: user.profile?.displayName || user.email.split("@")[0],
          avatarUrl: user.profile?.avatarUrl,
          tier: user.subscription?.tier || "FREE",
        },
      },
      { status: 200 }
    );

    const cookieOptions = getAuthCookieOptions();
    response.cookies.set("courseit_session", token, cookieOptions);

    return response;
  } catch (error: any) {
    console.error("Social OAuth error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to authenticate with social provider." },
      { status: 500 }
    );
  }
}
