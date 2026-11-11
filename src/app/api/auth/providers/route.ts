import { NextResponse } from "next/server";
import { getPublicAuthProvidersStatus } from "@/lib/auth-providers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const providers = await getPublicAuthProvidersStatus();
    return NextResponse.json({ success: true, providers });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to inspect auth providers";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

