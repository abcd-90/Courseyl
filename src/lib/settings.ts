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

    const parseStructure = () => {
      const val = map.get("site_structure");
      if (!val) return DEFAULT_SETTINGS.structure;
      try {
        const parsed = JSON.parse(val);
        const existingSections = Array.isArray(parsed.sections) ? parsed.sections : [];
        const existingIds = new Set(existingSections.map((s: any) => s.id));
        const mergedSections = [
          ...existingSections,
          ...DEFAULT_SETTINGS.structure.sections.filter((s) => !existingIds.has(s.id)),
        ];
        return {
          ...DEFAULT_SETTINGS.structure,
          ...parsed,
          announcementBanner: {
            ...DEFAULT_SETTINGS.structure.announcementBanner,
            ...(parsed.announcementBanner || {}),
          },
          socialLinks: {
            ...DEFAULT_SETTINGS.structure.socialLinks,
            ...(parsed.socialLinks || {}),
          },
          navLinks:
            Array.isArray(parsed.navLinks) && parsed.navLinks.length > 0
              ? parsed.navLinks
              : DEFAULT_SETTINGS.structure.navLinks,
          sections: mergedSections,
        };
      } catch {
        return DEFAULT_SETTINGS.structure;
      }
    };

    const resolved: FullSiteSettings = {
      branding: parseJSON("site_branding", DEFAULT_SETTINGS.branding),
      plans: parseJSON("site_plans", DEFAULT_SETTINGS.plans),
      ai: parseJSON("site_ai", DEFAULT_SETTINGS.ai),
      structure: parseStructure(),
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
      ...DEFAULT_SETTINGS.plans,
      ...full.plans,
      unlimitedFreeMode: full.plans.unlimitedFreeMode ?? true,
    },
    structure: full.structure,
  };
}

/**
 * Save settings category to database (Server only)
 */
export async function saveSettingsCategory(
  category: "site_branding" | "site_plans" | "site_ai" | "site_structure",
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
