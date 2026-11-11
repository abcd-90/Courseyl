import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getRequestOrigin,
  sanitizeNextPath,
  upsertVerifiedUser,
  attachSessionCookie,
} from "@/lib/auth";
import { getEffectiveAuthConfig } from "@/lib/auth-providers";

export async function GET(req: Request) {
  const origin = getRequestOrigin(req);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const stateParam = searchParams.get("state");
    const errorParam = searchParams.get("error");

    let next = "/dashboard";
    let stateNonce = "";
    if (stateParam) {
      try {
        const decoded = JSON.parse(
          Buffer.from(stateParam, "base64url").toString("utf-8")
        );
        next = sanitizeNextPath(decoded.next);
        stateNonce = typeof decoded.nonce === "string" ? decoded.nonce : "";
      } catch {}
    }

    if (errorParam) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            `Google sign-in was cancelled or denied (${errorParam}).`
          )}`,
          origin
        )
      );
    }

    if (!code) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("No authorization code returned by Google.")}`,
          origin
        )
      );
    }

    const cookieStore = await cookies();
    const expectedNonce = cookieStore.get("oauth_google_nonce")?.value || "";
    if (!expectedNonce || !stateNonce || expectedNonce !== stateNonce) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("OAuth state verification failed. Please try signing in again.")}`,
          origin
        )
      );
    }

    const cfg = await getEffectiveAuthConfig();
    if (!cfg.googleClientId || !cfg.googleClientSecret) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Google OAuth credentials are not configured.")}`,
          origin
        )
      );
    }

    const redirectUri = `${origin}/api/auth/google/callback`;

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: cfg.googleClientId,
        client_secret: cfg.googleClientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok || !tokenData.access_token) {
      const msg =
        tokenData.error_description || tokenData.error || "Token exchange failed";
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(`Google authentication failed: ${msg}`)}`,
          origin
        )
      );
    }

    const profileResponse = await fetch(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );
    const profile = await profileResponse.json();

    if (!profileResponse.ok || !profile.email || profile.verified_email === false) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Your Google account must have a verified email address.")}`,
          origin
        )
      );
    }

    const user = await upsertVerifiedUser({
      email: profile.email,
      provider: "google",
      providerId: String(profile.id || ""),
      displayName: profile.name || profile.given_name,
      avatarUrl: profile.picture,
    });

    const res = NextResponse.redirect(new URL(next, origin));
    res.cookies.delete("oauth_google_nonce");
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    console.error("Fatal Google callback error:", err);
    const msg =
      err instanceof Error ? err.message : "Google authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}
