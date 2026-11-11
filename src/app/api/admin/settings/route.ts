import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  AUTH_SECRETS_KEY,
  getMaskedAuthSecretsForAdmin,
  getPublicAuthProvidersStatus,
  saveAuthSecretsForAdmin,
} from "@/lib/auth-providers";
import { getFullSettings, saveSettingsCategory } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized access: Administrator role required." },
        { status: 403 }
      );
    }

    const [fullSettings, authSecrets, authProviders] = await Promise.all([
      getFullSettings(),
      getMaskedAuthSecretsForAdmin(),
      getPublicAuthProvidersStatus(),
    ]);

    return NextResponse.json({
      success: true,
      settings: fullSettings,
      authSecrets,
      authProviders,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error reading admin settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized access: Administrator role required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { category, data } = body;

    if (category === AUTH_SECRETS_KEY) {
      await saveAuthSecretsForAdmin(data || {});
      const [authSecrets, authProviders] = await Promise.all([
        getMaskedAuthSecretsForAdmin(),
        getPublicAuthProvidersStatus(),
      ]);
      return NextResponse.json({
        success: true,
        message: "OAuth & Email Verification credentials updated securely!",
        authSecrets,
        authProviders,
      });
    }

    if (
      ![
        "site_branding",
        "site_plans",
        "site_ai",
        "site_structure",
      ].includes(category)
    ) {
      return NextResponse.json(
        { error: "Invalid settings category." },
        { status: 400 }
      );
    }

    await saveSettingsCategory(category, data);
    try {
      revalidatePath("/", "layout");
    } catch {}

    const [updated, authSecrets, authProviders] = await Promise.all([
      getFullSettings(),
      getMaskedAuthSecretsForAdmin(),
      getPublicAuthProvidersStatus(),
    ]);

    return NextResponse.json({
      success: true,
      message: `${category.replace("site_", "").toUpperCase()} settings updated successfully!`,
      settings: updated,
      authSecrets,
      authProviders,
    });
  } catch (err: unknown) {
    const msg =
      err instanceof Error ? err.message : "Error saving admin settings";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
