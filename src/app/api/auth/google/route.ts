import crypto from "crypto";
import { NextResponse } from "next/server";
import {
  getRequestOrigin,
  sanitizeNextPath,
  upsertVerifiedUser,
  attachSessionCookie,
} from "@/lib/auth";
import { getEffectiveAuthConfig } from "@/lib/auth-providers";
import { createServerSupabaseAuthClient } from "@/lib/supabaseClient";

// GET /api/auth/google -> Redirect to Google's official OAuth 2.0 authorization screen
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const next = sanitizeNextPath(searchParams.get("next"));
    const origin = getRequestOrigin(req);

    const cfg = await getEffectiveAuthConfig();
    const clientId = cfg.googleClientId;
    if (!clientId) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            "Google OAuth is not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in environment variables."
          )}`,
          origin
        )
      );
    }

    const redirectUri = `${origin}/api/auth/google/callback`;
    const nonce = crypto.randomBytes(16).toString("hex");
    const state = Buffer.from(JSON.stringify({ next, nonce })).toString(
      "base64url"
    );

    const googleAuthUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    googleAuthUrl.searchParams.set("client_id", clientId);
    googleAuthUrl.searchParams.set("redirect_uri", redirectUri);
    googleAuthUrl.searchParams.set("response_type", "code");
    googleAuthUrl.searchParams.set("scope", "openid email profile");
    googleAuthUrl.searchParams.set("access_type", "offline");
    googleAuthUrl.searchParams.set("prompt", "select_account");
    googleAuthUrl.searchParams.set("state", state);

    const res = NextResponse.redirect(googleAuthUrl.toString());
    res.cookies.set("oauth_google_nonce", nonce, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 600,
      path: "/",
    });
    return res;
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to initiate Google login";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, req.url)
    );
  }
}

// POST /api/auth/google -> Strictly verifies a Supabase accessToken or Google ID token via Google/Supabase tokeninfo
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { accessToken, idToken } = body;

    if (accessToken && typeof accessToken === "string") {
      const sb = createServerSupabaseAuthClient();
      const { data, error } = await sb.auth.getUser(accessToken);
      const sbUser = data?.user;
      const sbEmail = sbUser?.email;
      if (error || !sbUser || !sbEmail) {
        return NextResponse.json(
          { error: "Invalid or expired Google/Supabase session token." },
          { status: 401 }
        );
      }

      const user = await upsertVerifiedUser({
        email: sbEmail,
        provider: "google",
        providerId: sbUser.id,
        displayName:
          sbUser.user_metadata?.full_name || sbUser.user_metadata?.name,
        avatarUrl:
          sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture,
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
      return attachSessionCookie(res, user);
    }

    if (idToken && typeof idToken === "string") {
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(
          idToken
        )}`
      );
      const payload = await tokenInfoRes.json();
      const cfg = await getEffectiveAuthConfig();
      if (
        !tokenInfoRes.ok ||
        !payload.email ||
        payload.email_verified !== "true" ||
        (cfg.googleClientId && payload.aud !== cfg.googleClientId)
      ) {
        return NextResponse.json(
          { error: "Invalid or unverified Google ID token." },
          { status: 401 }
        );
      }

      const user = await upsertVerifiedUser({
        email: payload.email,
        provider: "google",
        providerId: payload.sub,
        displayName: payload.name || payload.given_name,
        avatarUrl: payload.picture,
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
      return attachSessionCookie(res, user);
    }

    return NextResponse.json(
      { error: "A verified OAuth token is required." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to process Google login";
    return NextResponse.json({ error: msg }, { status: 401 });
  }
}
