export interface SiteBrandingSettings {
  brandName: string;
  brandSuffix: string;
  tagline: string;
  subTagline: string;
  badgeText: string;
  primaryColor: string;
  accentColor: string;
  darkBgColor: string;
  lightBgColor: string;
  fontFamily: string;
  logoIcon: "grad-cap" | "sparkles" | "code" | "rocket" | "video";
  customLogoUrl: string;
}

export interface SitePlanSettings {
  freeHoursLimit: number;
  freeGenerationsLimit: number;
  unlimitedFreeMode?: boolean; // When true: 5-hour limit and generation quotas are completely switched OFF for testing
  proPriceMonthly: number;
  proHoursLimit: number;
  proGenerationsLimit: number;
  maxPriceMonthly: number;
  maxHoursLimit: number;
  maxGenerationsLimit: number;
  allowNewSignups: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export interface SiteAiSettings {
  activeProvider: string;
  modelName: string;
  apiKey: string;
  temperature: number;
  systemPromptOverride: string;
}

export interface FullSiteSettings {
  branding: SiteBrandingSettings;
  plans: SitePlanSettings;
  ai: SiteAiSettings;
}

export const DEFAULT_SETTINGS: FullSiteSettings = {
  branding: {
    brandName: "Courseyl",
    brandSuffix: "yl",
    tagline: "Turn any YouTube video into a course you actually finish.",
    subTagline: "Structured lessons, active recall quizzes, interactive note-taking, and personalized placement tests in one distraction-free space.",
    badgeText: "No distraction between your studies",
    primaryColor: "#4b5e1e",
    accentColor: "#b8c460",
    darkBgColor: "#0e1311",
    lightBgColor: "#fcfcfa",
    fontFamily: "Familjen Grotesk",
    logoIcon: "grad-cap",
    customLogoUrl: "",
  },
  plans: {
    freeHoursLimit: 9999,
    freeGenerationsLimit: 9999,
    unlimitedFreeMode: true,
    proPriceMonthly: 12,
    proHoursLimit: 40,
    proGenerationsLimit: 25,
    maxPriceMonthly: 29,
    maxHoursLimit: 120,
    maxGenerationsLimit: 100,
    allowNewSignups: true,
    maintenanceMode: false,
    maintenanceMessage: "Courseyl is currently undergoing scheduled platform upgrades. We will be back shortly!",
  },
  ai: {
    activeProvider: "NVIDIA_NEMOTRON",
    modelName: "nvidia/llama-3.1-nemotron-70b-instruct",
    apiKey: "",
    temperature: 0.3,
    systemPromptOverride: "",
  },
};

