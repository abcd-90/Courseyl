import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import {
  createStripePortalSession,
  isBillingConfigured,
  resolveSiteOrigin,
} from "@/lib/billing";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const wantsJson =
      searchParams.get("format") === "json" ||
      !req.headers.get("accept")?.includes("text/html");

    const user = await getCurrentUser();
    const origin = resolveSiteOrigin(req);

    if (!user) {
      if (wantsJson) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      return NextResponse.redirect(`${origin}/login?next=/billing`);
    }

    if (!isBillingConfigured()) {
      const fallbackUrl = `${origin}/billing?portal=unavailable`;
      if (wantsJson) {
        return NextResponse.json(
          {
            configured: false,
            url: fallbackUrl,
            message:
              "Customer billing portal is unavailable in this environment (STRIPE_SECRET_KEY is not configured).",
          },
          { status: 503 }
        );
      }
      return NextResponse.redirect(fallbackUrl);
    }

    const portal = await createStripePortalSession({
      userEmail: user.email,
      returnUrl: `${origin}/billing`,
    });

    if (wantsJson) {
      return NextResponse.json({
        configured: true,
        url: portal.url,
      });
    }

    return NextResponse.redirect(portal.url);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unable to open billing portal";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

