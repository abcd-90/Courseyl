import crypto from "crypto";
import { NextResponse } from "next/server";
import { getRequestOrigin, sanitizeNextPath } from "@/lib/auth";
import {
  getEffectiveAuthConfig,
  getSupabaseAuthSettings,
} from "@/lib/auth-providers";
import { supabaseUrl } from "@/lib/supabaseClient";

// GET /api/auth/x -> Direct X (Twitter) OAuth 2.0 + PKCE or Supabase Twitter OAuth
export async function GET(req: Request) {
  const origin = getRequestOrigin(req);

  try {
    const { searchParams } = new URL(req.url);
    const next = sanitizeNextPath(searchParams.get("next"));

    const [cfg, sbSettings] = await Promise.all([
      getEffectiveAuthConfig(),
      getSupabaseAuthSettings(),
    ]);

    if (cfg.xClientId && cfg.xClientSecret) {
      const nonce = crypto.randomBytes(16).toString("hex");
      const codeVerifier = crypto.randomBytes(32).toString("base64url");
      const codeChallenge = crypto
        .createHash("sha256")
        .update(codeVerifier)
        .digest("base64url");

      const redirectUri = `${origin}/api/auth/x/callback`;

      const xUrl = new URL("https://twitter.com/i/oauth2/authorize");
      xUrl.searchParams.set("response_type", "code");
      xUrl.searchParams.set("client_id", cfg.xClientId);
      xUrl.searchParams.set("redirect_uri", redirectUri);
      xUrl.searchParams.set("scope", "tweet.read users.read users.email");
      xUrl.searchParams.set("state", nonce);
      xUrl.searchParams.set("code_challenge", codeChallenge);
      xUrl.searchParams.set("code_challenge_method", "S256");

      const res = NextResponse.redirect(xUrl.toString());
      res.cookies.set(
        "oauth_x_pkce",
        JSON.stringify({ nonce, codeVerifier, next }),
        {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          maxAge: 600,
          path: "/",
        }
      );
      return res;
    }

    if (sbSettings?.external?.twitter) {
      const sbAuthorize = new URL(`${supabaseUrl}/auth/v1/authorize`);
      sbAuthorize.searchParams.set("provider", "twitter");
      sbAuthorize.searchParams.set(
        "redirect_to",
        `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      );
      return NextResponse.redirect(sbAuthorize.toString());
    }

    return NextResponse.redirect(
      new URL(
        `/login?providerError=x&error=${encodeURIComponent(
          `X (Twitter) OAuth requires X_CLIENT_ID & X_CLIENT_SECRET (Callback URL: ${origin}/api/auth/x/callback) or enabling Twitter/X inside Supabase Auth Providers.`
        )}`,
        origin
      )
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to start X OAuth";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}

