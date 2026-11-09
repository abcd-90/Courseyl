import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, getAuthCookieOptions } from "@/lib/auth";

// GET /api/auth/google -> Redirect to Google's official OAuth 2.0 authorization screen
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const next = searchParams.get("next") || "/dashboard";

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return NextResponse.redirect(
        new URL("/login?error=Google+OAuth+is+not+configured.+Please+add+GOOGLE_CLIENT_ID+to+Vercel+Environment+Variables.", req.url)
      );
    }

    // Detect current request origin (supports localhost & Vercel deployment)
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "localhost:3000";
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`;
    const redirectUri = `${origin}/api/auth/google/callback`;

    const stateObj = { next, origin };
    const state = Buffer.from(JSON.stringify(stateObj)).toString("base64url");

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", state);

    return NextResponse.redirect(googleAuthUrl.toString());
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to initiate Google login";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url)
    );
  }
}

// POST /api/auth/google -> Authenticate with Google ID token credential or payload
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
