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

    if (errorParam) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            `X sign-in cancelled or denied (${errorParam}).`
          )}`,
          origin
        )
      );
    }

    const cookieStore = await cookies();
    const rawCookie = cookieStore.get("oauth_x_pkce")?.value;
    if (!code || !stateParam || !rawCookie) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Missing or expired X OAuth verification session.")}`,
          origin
        )
      );
    }

    let parsed: { nonce: string; codeVerifier: string; next: string };
    try {
      parsed = JSON.parse(rawCookie);
    } catch {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Invalid X OAuth state cookie.")}`,
          origin
        )
      );
    }

    if (!parsed.nonce || parsed.nonce !== stateParam || !parsed.codeVerifier) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("X OAuth state mismatch. Please retry.")}`,
          origin
        )
      );
    }

    const cfg = await getEffectiveAuthConfig();
    if (!cfg.xClientId || !cfg.xClientSecret) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("X OAuth credentials are not configured.")}`,
          origin
        )
      );
    }

    const basicAuth = Buffer.from(
      `${cfg.xClientId}:${cfg.xClientSecret}`
    ).toString("base64");

    const tokenRes = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        client_id: cfg.xClientId,
        redirect_uri: `${origin}/api/auth/x/callback`,
        code_verifier: parsed.codeVerifier,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            tokenData.error_description || "Failed to exchange X access token."
          )}`,
          origin
        )
      );
    }

    const meRes = await fetch(
      "https://api.twitter.com/2/users/me?user.fields=profile_image_url,confirmed_email,name,username",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      }
    );

    const meJson = await meRes.json();
    const xUser = meJson?.data;
    if (!meRes.ok || !xUser?.id) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Failed to retrieve your X profile.")}`,
          origin
        )
      );
    }

    const resolvedEmail =
      xUser.confirmed_email ||
      `${String(xUser.username || xUser.id).toLowerCase()}.${xUser.id}@x-oauth.courseyl.internal`;

    const user = await upsertVerifiedUser({
      email: resolvedEmail,
      provider: "x",
      providerId: String(xUser.id),
      displayName: xUser.name || `@${xUser.username}`,
      avatarUrl: xUser.profile_image_url,
    });

    const res = NextResponse.redirect(
      new URL(sanitizeNextPath(parsed.next), origin)
    );
    res.cookies.delete("oauth_x_pkce");
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    console.error("X OAuth callback error:", err);
    const msg =
      err instanceof Error ? err.message : "X authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}

