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
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  const updateLiveColors = (primary: string, accent: string, darkBg: string, lightBg: string) => {
    if (typeof document === "undefined") return;
    const root = document.documentElement;
    if (primary) root.style.setProperty("--moss", primary);
    if (accent) root.style.setProperty("--lime", accent);
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
