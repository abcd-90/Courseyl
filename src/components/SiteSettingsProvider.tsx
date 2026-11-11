"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_SETTINGS, FullSiteSettings } from "@/lib/settings-types";

interface SiteSettingsContextType {
  settings: FullSiteSettings;
  loading: boolean;
  refreshSettings: () => Promise<void>;
  updateLiveColors: (primary: string, accent: string, darkBg: string, lightBg: string) => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextType>({
  settings: DEFAULT_SETTINGS,
  loading: false,
  refreshSettings: async () => {},
  updateLiveColors: () => {},
});

export function SiteSettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode;
  initialSettings?: Partial<FullSiteSettings>;
}) {
  const [settings, setSettings] = useState<FullSiteSettings>(() => ({
    ...DEFAULT_SETTINGS,
    ...(initialSettings || {}),
    branding: { ...DEFAULT_SETTINGS.branding, ...(initialSettings?.branding || {}) },
    plans: { ...DEFAULT_SETTINGS.plans, ...(initialSettings?.plans || {}) },
    ai: { ...DEFAULT_SETTINGS.ai, ...(initialSettings?.ai || {}) },
    structure: { ...DEFAULT_SETTINGS.structure, ...(initialSettings?.structure || {}) },
  }));
  const [loading, setLoading] = useState(false);

  const applyColorsToDOM = (branding: FullSiteSettings["branding"]) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    if (branding.fontFamily) {
      root.style.setProperty("--font-family-display", `"${branding.fontFamily}", sans-serif`);
      if (branding.fontFamily !== "Familjen Grotesk" && typeof document !== "undefined") {
        const fontId = "dynamic-admin-google-font";
        let linkEl = document.getElementById(fontId) as HTMLLinkElement | null;
        if (!linkEl) {
          linkEl = document.createElement("link");
          linkEl.id = fontId;
          linkEl.rel = "stylesheet";
          document.head.appendChild(linkEl);
        }
        const fam = encodeURIComponent(branding.fontFamily).replace(/%20/g, "+");
        linkEl.href = `https://fonts.googleapis.com/css2?family=${fam}:wght@400;500;600;700&display=swap`;
      }
    }

    const isCustomPrimary =
      branding.primaryColor &&
      branding.primaryColor.startsWith("#") &&
      branding.primaryColor.toLowerCase() !== "#4b5e1e";
    if (isCustomPrimary) {
      root.style.setProperty("--primary", branding.primaryColor);
      root.style.setProperty("--moss", branding.primaryColor);
      root.style.setProperty("--moss-dark", branding.primaryColor);
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--moss");
      root.style.removeProperty("--moss-dark");
    }

    const isCustomAccent =
      branding.accentColor &&
      branding.accentColor.startsWith("#") &&
      branding.accentColor.toLowerCase() !== "#b8c460";
    if (isCustomAccent) {
      root.style.setProperty("--accent", branding.accentColor);
      root.style.setProperty("--lime", branding.accentColor);
    } else {
      root.style.removeProperty("--accent");
      root.style.removeProperty("--lime");
    }

    const isDark = root.classList.contains("dark");
    const customLight =
      branding.lightBgColor &&
      branding.lightBgColor.startsWith("#") &&
      branding.lightBgColor.toLowerCase() !== "#fcfcfa"
        ? branding.lightBgColor
        : null;
    const customDark =
      branding.darkBgColor &&
      branding.darkBgColor.startsWith("#") &&
      branding.darkBgColor.toLowerCase() !== "#0e1311"
        ? branding.darkBgColor
        : null;

    if (isDark && customDark) {
      root.style.setProperty("--paper", customDark);
      root.style.setProperty("--background", customDark);
    } else if (!isDark && customLight) {
      root.style.setProperty("--paper", customLight);
      root.style.setProperty("--background", customLight);
    } else {
      root.style.removeProperty("--paper");
      root.style.removeProperty("--background");
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setSettings((prev) => ({
          ...prev,
          branding: { ...prev.branding, ...(data.branding || {}) },
          plans: { ...prev.plans, ...(data.plans || {}) },
          structure: data.structure
            ? {
                ...DEFAULT_SETTINGS.structure,
                ...data.structure,
                announcementBanner: {
                  ...DEFAULT_SETTINGS.structure.announcementBanner,
                  ...(data.structure.announcementBanner || {}),
                },
                socialLinks: {
                  ...DEFAULT_SETTINGS.structure.socialLinks,
                  ...(data.structure.socialLinks || {}),
                },
                navLinks:
                  Array.isArray(data.structure.navLinks) && data.structure.navLinks.length > 0
                    ? data.structure.navLinks
                    : DEFAULT_SETTINGS.structure.navLinks,
                sections:
                  Array.isArray(data.structure.sections) && data.structure.sections.length > 0
                    ? data.structure.sections
                    : DEFAULT_SETTINGS.structure.sections,
              }
            : prev.structure,
        }));
        if (data.branding) {
          applyColorsToDOM(data.branding);
        }
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const updateLiveColors = (primary: string, accent: string, darkBg: string, lightBg: string) => {
    applyColorsToDOM({
      ...settings.branding,
      primaryColor: primary || settings.branding.primaryColor,
      accentColor: accent || settings.branding.accentColor,
      darkBgColor: darkBg || settings.branding.darkBgColor,
      lightBgColor: lightBg || settings.branding.lightBgColor,
    });
  };

  useEffect(() => {
    applyColorsToDOM(settings.branding);
    refreshSettings();
  }, []);

  useEffect(() => {
    applyColorsToDOM(settings.branding);
    if (typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(() => {
      applyColorsToDOM(settings.branding);
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, [
    settings.branding.primaryColor,
    settings.branding.accentColor,
    settings.branding.darkBgColor,
    settings.branding.lightBgColor,
    settings.branding.fontFamily,
  ]);

  return (
    <SiteSettingsContext.Provider
      value={{
        settings,
        loading,
        refreshSettings,
        updateLiveColors,
      }}
    >
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings() {
  return useContext(SiteSettingsContext);
}
