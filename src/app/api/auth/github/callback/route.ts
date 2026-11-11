import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import {
  getRequestOrigin,
  sanitizeNextPath,
  upsertVerifiedUser,
  attachSessionCookie,
} from "@/lib/auth";
import { getEffectiveAuthConfig } from "@/lib/auth-providers";

interface GitHubEmailRecord {
  email: string;
  primary: boolean;
  verified: boolean;
}

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
            `GitHub login cancelled or denied (${errorParam}).`
          )}`,
          origin
        )
      );
    }

    if (!code || !stateParam) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Missing GitHub authorization code.")}`,
          origin
        )
      );
    }

    let next = "/dashboard";
    let stateNonce = "";
    try {
      const decoded = JSON.parse(
        Buffer.from(stateParam, "base64url").toString("utf-8")
      );
      next = sanitizeNextPath(decoded.next);
      stateNonce = typeof decoded.nonce === "string" ? decoded.nonce : "";
    } catch {}

    const cookieStore = await cookies();
    const expectedNonce = cookieStore.get("oauth_github_nonce")?.value || "";
    if (!expectedNonce || !stateNonce || expectedNonce !== stateNonce) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("GitHub OAuth state mismatch. Please retry.")}`,
          origin
        )
      );
    }

    const cfg = await getEffectiveAuthConfig();
    if (!cfg.githubClientId || !cfg.githubClientSecret) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("GitHub OAuth credentials are not configured.")}`,
          origin
        )
      );
    }

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: cfg.githubClientId,
        client_secret: cfg.githubClientSecret,
        code,
        redirect_uri: `${origin}/api/auth/github/callback`,
      }),
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent(
            tokenData.error_description || "Failed to exchange GitHub access token."
          )}`,
          origin
        )
      );
    }

    const ghHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "Courseyl-App",
    };

    const [profileRes, emailsRes] = await Promise.all([
      fetch("https://api.github.com/user", { headers: ghHeaders }),
      fetch("https://api.github.com/user/emails", { headers: ghHeaders }),
    ]);

    const ghUser = await profileRes.json();
    if (!profileRes.ok || !ghUser?.id) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Could not fetch GitHub profile details.")}`,
          origin
        )
      );
    }

    let verifiedEmail: string | null = null;
    if (emailsRes.ok) {
      const emails: GitHubEmailRecord[] = await emailsRes.json();
      const primaryVerified = emails.find((e) => e.verified && e.primary);
      const anyVerified = emails.find((e) => e.verified);
      verifiedEmail = primaryVerified?.email || anyVerified?.email || null;
    }

    if (!verifiedEmail && ghUser.email) {
      verifiedEmail = ghUser.email;
    }

    if (!verifiedEmail) {
      return NextResponse.redirect(
        new URL(
          `/login?error=${encodeURIComponent("Please verify an email address on your GitHub account before signing in.")}`,
          origin
        )
      );
    }

    const user = await upsertVerifiedUser({
      email: verifiedEmail,
      provider: "github",
      providerId: String(ghUser.id),
      displayName: ghUser.name || ghUser.login,
      avatarUrl: ghUser.avatar_url,
    });

    const res = NextResponse.redirect(new URL(next, origin));
    res.cookies.delete("oauth_github_nonce");
    return attachSessionCookie(res, user);
  } catch (err: unknown) {
    console.error("GitHub OAuth callback error:", err);
    const msg =
      err instanceof Error ? err.message : "GitHub authentication failed";
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(msg)}`, origin)
    );
  }
}

