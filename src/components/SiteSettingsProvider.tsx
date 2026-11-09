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
  const [settings, setSettings] = useState<FullSiteSettings>({
    ...DEFAULT_SETTINGS,
    ...(initialSettings || {}),
  });
  const [loading, setLoading] = useState(false);

  const applyColorsToDOM = (branding: FullSiteSettings["branding"]) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;

    // Apply custom CSS variables
    if (branding.primaryColor) {
      root.style.setProperty("--moss", branding.primaryColor);
    }
    if (branding.accentColor) {
      root.style.setProperty("--lime", branding.accentColor);
    }
    if (branding.lightBgColor) {
      root.style.setProperty("--paper-custom", branding.lightBgColor);
    }
    if (branding.darkBgColor) {
      root.style.setProperty("--dark-bg-custom", branding.darkBgColor);
    }
    if (branding.fontFamily) {
      root.style.setProperty("--font-family-display", `"${branding.fontFamily}", sans-serif`);
    }
  };

  const refreshSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        if (data.branding) {
          setSettings((prev) => ({
            ...prev,
            branding: { ...prev.branding, ...data.branding },
            plans: { ...prev.plans, ...(data.plans || {}) },
          }));
          applyColorsToDOM(data.branding);
        }
      }
    } catch {
      // Fallback to local
    } finally {
      setLoading(false);
    }
  };

  const updateLiveColors = (primary: string, accent: string, darkBg: string, lightBg: string) => {
    applyColorsToDOM({
      ...settings.branding,
      primaryColor: primary,
      accentColor: accent,
      darkBgColor: darkBg,
      lightBgColor: lightBg,
    });
  };

  useEffect(() => {
    applyColorsToDOM(settings.branding);
    refreshSettings();
  }, []);

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
