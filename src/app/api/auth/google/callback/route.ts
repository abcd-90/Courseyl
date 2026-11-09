import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { signToken, getAuthCookieOptions } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    let next = "/dashboard";
    if (stateParam) {
      try {
        const decoded = JSON.parse(
          Buffer.from(stateParam, "base64url").toString("utf-8")
        );
        if (decoded.next) next = decoded.next;
      } catch {}
    }

    if (errorParam) {
      console.warn("Google OAuth error parameter returned:", errorParam);
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(`Google sign-in was cancelled or encountered an error: ${errorParam}`)}`, req.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL("/login?error=No+authorization+code+provided+by+Google", req.url)
      );
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.redirect(
        new URL("/login?error=Google+OAuth+credentials+are+not+configured+in+environment", req.url)
      );
    }

    // Detect redirect URI (must match exact URI sent in authorization)
    const host =
      req.headers.get("x-forwarded-host") ||
      req.headers.get("host") ||
      "localhost:3000";
    const proto =
      req.headers.get("x-forwarded-proto") ||
      (host.includes("localhost") ? "http" : "https");
    const redirectUri = `${proto}://${host}/api/auth/google/callback`;

    // 1. Exchange authorization code for access token with Google
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error("Google token exchange failure:", tokenData);
      const msg = tokenData.error_description || tokenData.error || "Token exchange failed";
      return NextResponse.redirect(
        new URL(`/login?error=${encodeURIComponent(`Google authentication failed: ${msg}`)}`, req.url)
      );
    }

    // 2. Fetch authenticated user profile from Google UserInfo endpoint
    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.email) {
      return NextResponse.redirect(
        new URL("/login?error=Could+not+retrieve+email+from+Google+profile", req.url)
      );
    }

    const cleanEmail = profile.email.toLowerCase().trim();
    const cleanName = (profile.name || profile.given_name || cleanEmail.split("@")[0]).trim();
    const avatarUrl = profile.picture || null;

    // 3. Find or create user in Supabase PostgreSQL
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
      await prisma.profile.update({
        where: { userId: user.id },
        data: { avatarUrl },
      });
    }

    // 4. Sign JWT session token
    const token = signToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    const cookieOptions = getAuthCookieOptions();
    const destination = next.startsWith("/") ? next : "/dashboard";
    const res = NextResponse.redirect(new URL(destination, req.url));
    res.cookies.set(cookieOptions.name, token, cookieOptions);

    return res;
  } catch (err: unknown) {
    console.error("Fatal Google callback error:", err);
    const msg = err instanceof Error ? err.message : "Authentication callback failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url)
    );
  }
}
