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
  freePlanName?: string;
  proPlanName?: string;
  maxPlanName?: string;
  currencySymbol?: string;
  proPriceMonthly: number;
  proPriceYearly?: number;
  proHoursLimit: number;
  proGenerationsLimit: number;
  maxPriceMonthly: number;
  maxPriceYearly?: number;
  maxHoursLimit: number;
  maxGenerationsLimit: number;
  allowNewSignups: boolean;
  maintenanceMode: boolean;
  maintenanceMessage: string;
}

export type HomeSectionId =
  | "hero"
  | "tour"
  | "numbers"
  | "features"
  | "howItWorks"
  | "courses"
  | "stories"
  | "cta";

export interface HomeSectionConfig {
  id: HomeSectionId;
  label: string;
  badge: string;
  title: string;
  titleHighlight: string;
  subtitle: string;
  visible: boolean;
}

export interface NavLinkConfig {
  id: string;
  label: string;
  href: string;
  visible: boolean;
}

export interface SiteStructureSettings {
  announcementBanner: {
    visible: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
  };
  navLinks: NavLinkConfig[];
  navLoginLabel: string;
  navCtaLabel: string;
  heroHeadline: string;
  heroHeadlineHighlight: string;
  heroPrimaryCtaLabel: string;
  heroSecondaryCtaLabel: string;
  heroMetaLine: string;
  heroSampleLink: string;
  sections: HomeSectionConfig[];
  footerDescription: string;
  footerCopyrightName: string;
  footerSubNote: string;
  footerRightNote: string;
  socialLinks: {
    twitterUrl: string;
    linkedinUrl: string;
    instagramUrl: string;
    contactEmail: string;
  };
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
  structure: SiteStructureSettings;
}

export const DEFAULT_HOME_SECTIONS: HomeSectionConfig[] = [
  {
    id: "hero",
    label: "Hero & Link Intake",
    badge: "Powered by NVIDIA Nemotron",
    title: "Turn any YouTube video into a course you",
    titleHighlight: "actually finish.",
    subtitle: "Bite-sized lessons, quizzes that replay what you missed, and a daily plan that fits your pace.",
    visible: true,
  },
  {
    id: "tour",
    label: "3D Product Tour Video",
    badge: "Product tour",
    title: "See how Courseyl turns lectures",
    titleHighlight: "into finished courses.",
    subtitle: "",
    visible: true,
  },
  {
    id: "numbers",
    label: "By The Numbers Metrics",
    badge: "By the numbers",
    title: "Real learners,",
    titleHighlight: "real courses.",
    subtitle: "Counted live from Courseyl, updated every hour.",
    visible: true,
  },
  {
    id: "features",
    label: "Bento Feature Grid",
    badge: "Features",
    title: "Everything you need to",
    titleHighlight: "finish that 6-hour playlist.",
    subtitle: "",
    visible: true,
  },
  {
    id: "howItWorks",
    label: "3-Step How It Works",
    badge: "How it works",
    title: "From a 6-hour video to",
    titleHighlight: "a plan you finish.",
    subtitle: "",
    visible: true,
  },
  {
    id: "courses",
    label: "Popular Community Courses",
    badge: "Popular courses",
    title: "Courses learners are",
    titleHighlight: "taking right now.",
    subtitle: "",
    visible: true,
  },
  {
    id: "stories",
    label: "Learner Stories & Reviews",
    badge: "Learners",
    title: "People who",
    titleHighlight: "actually finished.",
    subtitle: "",
    visible: true,
  },
  {
    id: "cta",
    label: "Bottom Dusk CTA Panel",
    badge: "Start today",
    title: "Your next course starts",
    titleHighlight: "today.",
    subtitle: "Paste a video or playlist and start lesson 1 while the rest of the course builds.",
    visible: true,
  },
];

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
    freePlanName: "Free",
    proPlanName: "Pro",
    maxPlanName: "Max",
    currencySymbol: "$",
    proPriceMonthly: 19,
    proPriceYearly: 15,
    proHoursLimit: 20,
    proGenerationsLimit: 25,
    maxPriceMonthly: 49,
    maxPriceYearly: 39,
    maxHoursLimit: 40,
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
  structure: {
    announcementBanner: {
      visible: false,
      text: "Unlimited Full Free Access is currently enabled across all AI course tools.",
      linkLabel: "Build a course",
      linkHref: "/dashboard",
    },
    navLinks: [
      { id: "features", label: "Features", href: "/#features", visible: true },
      { id: "courses", label: "Courses", href: "/#courses", visible: true },
      { id: "how-it-works", label: "How it works", href: "/#how-it-works", visible: true },
      { id: "pricing", label: "Pricing", href: "/pricing", visible: true },
    ],
    navLoginLabel: "Log in",
    navCtaLabel: "Start learning",
    heroHeadline: "Turn any YouTube video into a course you",
    heroHeadlineHighlight: "actually finish.",
    heroPrimaryCtaLabel: "Start with a link",
    heroSecondaryCtaLabel: "How it works",
    heroMetaLine: "No card needed · Playlists up to 20 hours · Progress saved automatically",
    heroSampleLink: "youtube.com/playlist?list=PLu0W_9lII9agwh1XjRt242xIpHhPT2llg",
    sections: DEFAULT_HOME_SECTIONS,
    footerDescription: "Structured lessons, quizzes, and a daily plan for any YouTube video or playlist. Built so the 6-hour lecture gets finished.",
    footerCopyrightName: "Courseyl",
    footerSubNote: "Made for people who finish what they start.",
    footerRightNote: "Videos play in YouTube's own player. Creators keep their views.",
    socialLinks: {
      twitterUrl: "https://twitter.com/courseitxyz",
      linkedinUrl: "https://www.linkedin.com/company/courseit/",
      instagramUrl: "https://www.instagram.com/courseitxyz",
      contactEmail: "hello@triggerfy.xyz",
    },
  },
};

