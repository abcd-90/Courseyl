import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getFullSettings, saveSettingsCategory } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Administrator role required." }, { status: 403 });
    }

    const fullSettings = await getFullSettings();
    return NextResponse.json({ success: true, settings: fullSettings });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error reading admin settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized access: Administrator role required." }, { status: 403 });
    }

    const body = await req.json();
    const { category, data } = body;

    if (!["site_branding", "site_plans", "site_ai", "site_structure"].includes(category)) {
      return NextResponse.json({ error: "Invalid settings category." }, { status: 400 });
    }

    await saveSettingsCategory(category, data);
    try {
      revalidatePath("/", "layout");
    } catch {}

    const updated = await getFullSettings();
    return NextResponse.json({
      success: true,
      message: `${category.replace("site_", "").toUpperCase()} settings updated successfully!`,
      settings: updated,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error saving admin settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

