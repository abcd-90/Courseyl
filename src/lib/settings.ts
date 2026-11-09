import { prisma } from "./db";
import { DEFAULT_SETTINGS, FullSiteSettings } from "./settings-types";

export * from "./settings-types";

let memoryCachedSettings: FullSiteSettings | null = null;
let lastCacheTimestamp = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Fetch full settings merged with defaults (Server only)
 */
export async function getFullSettings(): Promise<FullSiteSettings> {
  const now = Date.now();
  if (memoryCachedSettings && now - lastCacheTimestamp < CACHE_TTL_MS) {
    return memoryCachedSettings;
  }

  try {
    const rows = await prisma.platformSetting.findMany();
    const map = new Map(rows.map((r) => [r.key, r.value]));

    const parseJSON = (key: string, fallback: any) => {
      const val = map.get(key);
      if (!val) return fallback;
      try {
        return { ...fallback, ...JSON.parse(val) };
      } catch {
        return fallback;
      }
    };

    const resolved: FullSiteSettings = {
      branding: parseJSON("site_branding", DEFAULT_SETTINGS.branding),
      plans: parseJSON("site_plans", DEFAULT_SETTINGS.plans),
      ai: parseJSON("site_ai", DEFAULT_SETTINGS.ai),
    };

    memoryCachedSettings = resolved;
    lastCacheTimestamp = now;
    return resolved;
  } catch (err) {
    console.error("Error reading site settings, using defaults:", err);
    return memoryCachedSettings || DEFAULT_SETTINGS;
  }
}

/**
 * Fetch public settings safe for unauthenticated visitors (Server only)
 */
export async function getPublicSettings() {
  const full = await getFullSettings();
  return {
    branding: full.branding,
    plans: {
      freeHoursLimit: full.plans.freeHoursLimit,
      proPriceMonthly: full.plans.proPriceMonthly,
      maxPriceMonthly: full.plans.maxPriceMonthly,
      maintenanceMode: full.plans.maintenanceMode,
      maintenanceMessage: full.plans.maintenanceMessage,
      allowNewSignups: full.plans.allowNewSignups,
    },
  };
}

/**
 * Save settings category to database (Server only)
 */
export async function saveSettingsCategory(
  category: "site_branding" | "site_plans" | "site_ai",
  data: any
) {
  memoryCachedSettings = null; // Invalidate cache immediately
  lastCacheTimestamp = 0;

  return prisma.platformSetting.upsert({
    where: { key: category },
    update: { value: JSON.stringify(data) },
    create: { key: category, value: JSON.stringify(data) },
  });
}
