import { NextResponse } from "next/server";
import { getPublicSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getPublicSettings();
    return NextResponse.json(settings, {
      headers: {
        "Cache-Control": "public, s-maxage=10, stale-while-revalidate=59",
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error fetching settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

