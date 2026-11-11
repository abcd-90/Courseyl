import crypto from "crypto";
import { NextResponse } from "next/server";
import { getRequestOrigin, sanitizeNextPath } from "@/lib/auth";
import {
  getEffectiveAuthConfig,
  getSupabaseAuthSettings,
} from "@/lib/auth-providers";
import { supabaseUrl } from "@/lib/supabaseClient";

// GET /api/auth/github -> Direct GitHub OAuth 2.0 OR Supabase GitHub OAuth if enabled
export async function GET(req: Request) {
  const origin = getRequestOrigin(req);

  try {
    const { searchParams } = new URL(req.url);
    const next = sanitizeNextPath(searchParams.get("next"));

    const [cfg, sbSettings] = await Promise.all([
      getEffectiveAuthConfig(),
      getSupabaseAuthSettings(),
    ]);

    if (cfg.githubClientId && cfg.githubClientSecret) {
      const nonce = crypto.randomBytes(16).toString("hex");
      const state = Buffer.from(JSON.stringify({ next, nonce })).toString(
        "base64url"
      );
      const redirectUri = `${origin}/api/auth/github/callback`;

      const ghUrl = new URL("https://github.com/login/oauth/authorize");
      ghUrl.searchParams.set("client_id", cfg.githubClientId);
      ghUrl.searchParams.set("redirect_uri", redirectUri);
      ghUrl.searchParams.set("scope", "read:user user:email");
      ghUrl.searchParams.set("state", state);

      const res = NextResponse.redirect(ghUrl.toString());
      res.cookies.set("oauth_github_nonce", nonce, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 600,
        path: "/",
      });
      return res;
    }

    if (sbSettings?.external?.github) {
      const sbAuthorize = new URL(`${supabaseUrl}/auth/v1/authorize`);
      sbAuthorize.searchParams.set("provider", "github");
      sbAuthorize.searchParams.set(
        "redirect_to",
        `${origin}/auth/callback?next=${encodeURIComponent(next)}`
      );
      return NextResponse.redirect(sbAuthorize.toString());
    }

    return NextResponse.redirect(
      new URL(
        `/login?providerError=github&error=${encodeURIComponent(
          `GitHub OAuth requires GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET (Callback URL: ${origin}/api/auth/github/callback) or enabling GitHub inside Supabase Auth Providers.`
        )}`,
        origin
      )
    );
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Failed to start GitHub OAuth";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}

