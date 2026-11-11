import { NextResponse } from "next/server";
import { attachSessionCookie, upsertVerifiedUser } from "@/lib/auth";
import { createServerSupabaseAuthClient } from "@/lib/supabaseClient";

/**
 * POST /api/auth/social
 * Strictly verifies a signed Supabase Auth access_token on the server before issuing a session cookie.
 * Never trusts unverified client-supplied email/provider payloads.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const accessToken =
      typeof body?.accessToken === "string" ? body.accessToken.trim() : "";

    if (!accessToken) {
      return NextResponse.json(
        {
          error:
            "Verified authentication token is required. Direct email spoofing is blocked.",
        },
        { status: 401 }
      );
    }

    const sb = createServerSupabaseAuthClient();
    const { data, error } = await sb.auth.getUser(accessToken);

    if (error || !data?.user) {
      return NextResponse.json(
        { error: "Invalid or expired authentication session token." },
        { status: 401 }
      );
    }

    const sbUser = data.user;
    const rawProvider = String(
      sbUser.app_metadata?.provider || "email"
    ).toLowerCase();

    const mappedProvider: "email" | "google" =
      rawProvider === "google" ? "google" : "email";

    const isEmailConfirmed = Boolean(
      sbUser.email_confirmed_at || sbUser.confirmed_at || mappedProvider === "google"
    );

    if (!isEmailConfirmed) {
      return NextResponse.json(
        {
          error:
            "Your email address has not been confirmed yet. Please check your inbox.",
        },
        { status: 403 }
      );
    }

    const verifiedEmail = sbUser.email || null;

    if (!verifiedEmail) {
      return NextResponse.json(
        { error: "No verified email identity returned by provider." },
        { status: 400 }
      );
    }

    const displayName =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      sbUser.user_metadata?.preferred_username ||
      sbUser.user_metadata?.user_name;
    const avatarUrl =
      sbUser.user_metadata?.avatar_url || sbUser.user_metadata?.picture;

    const user = await upsertVerifiedUser({
      email: verifiedEmail,
      provider: mappedProvider,
      providerId: sbUser.id,
      displayName,
      avatarUrl,
    });

    const response = NextResponse.json(
      {
        success: true,
        message: `${mappedProvider.toUpperCase()} login verified`,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          name: user.profile?.displayName || user.email.split("@")[0],
          avatarUrl: user.profile?.avatarUrl,
          tier: user.subscription?.tier || "FREE",
        },
      },
      { status: 200 }
    );

    return attachSessionCookie(response, user);
  } catch (error: unknown) {
    console.error("Social OAuth token verification error:", error);
    const msg =
      error instanceof Error
        ? error.message
        : "Failed to verify authentication token.";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
