"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { CourseItLogo } from "@/components/CourseItLogo";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import {
  DEFAULT_SETTINGS,
  FullSiteSettings,
  SiteAiSettings,
  SiteBrandingSettings,
  SitePlanSettings,
  SiteStructureSettings,
} from "@/lib/settings-types";
import {
  AdminCoursesStudio,
  AdminCourseItem,
} from "@/components/admin/AdminCoursesStudio";
import { AdminStructureEditor } from "@/components/admin/AdminStructureEditor";

type AdminTab =
  | "overview"
  | "plans"
  | "courses"
  | "structure"
  | "branding"
  | "ai"
  | "users"
  | "security";

interface AdminMetrics {
  totalUsers: number;
  totalCourses: number;
  totalLessons: number;
  totalEnrollments: number;
  totalLearningHours: number;
  proSubscribers: number;
  totalJobs: number;
  completedJobs: number;
  aiSuccessRate: number;
}

interface RecentUserRow {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  subscription?: { tier?: string } | null;
}

interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  emailVerified?: boolean;
  authProvider?: string;
  displayName: string;
  tier: string;
  coursesCreated: number;
  coursesEnrolled: number;
  notesCount: number;
  createdAt: string;
}

interface AuthSecretsForm {
  githubClientId: string;
  githubClientSecret: string;
  xClientId: string;
  xClientSecret: string;
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

const COLOR_PRESETS = [
  {
    name: "Courseyl Botanical",
    primary: "#4b5e1e",
    accent: "#b8c460",
    lightBg: "#fcfcfa",
    darkBg: "#0e1311",
    badge: "Signature Olive",
  },
  {
    name: "Emerald Studio",
    primary: "#0f766e",
    accent: "#5eead4",
    lightBg: "#f8fbfa",
    darkBg: "#091514",
    badge: "Deep Teal",
  },
  {
    name: "Midnight Cobalt",
    primary: "#1d4ed8",
    accent: "#60a5fa",
    lightBg: "#f8faff",
    darkBg: "#090f1e",
    badge: "Sharp Tech",
  },
  {
    name: "Royal Violet",
    primary: "#6d28d9",
    accent: "#c4b5fd",
    lightBg: "#faf8ff",
    darkBg: "#110b1f",
    badge: "Creator Pro",
  },
  {
    name: "Warm Terracotta",
    primary: "#b45309",
    accent: "#fbbf24",
    lightBg: "#fffcf7",
    darkBg: "#161009",
    badge: "Warm Sunset",
  },
];

const FONT_OPTIONS = [
  "Familjen Grotesk",
  "Plus Jakarta Sans",
  "Space Grotesk",
  "Outfit",
  "DM Sans",
  "Sora",
  "Inter",
  "Playfair Display",
];

const NAV_TABS: { id: AdminTab; label: string; icon: string }[] = [
  { id: "overview", label: "Command Center", icon: "⚡" },
  { id: "plans", label: "Free / Paid & Prices", icon: "💎" },
  { id: "courses", label: "Courses & Dummy Studio", icon: "📚" },
  { id: "structure", label: "Site Layout & Copy", icon: "🧩" },
  { id: "branding", label: "Brand, Logo & Theme", icon: "🎨" },
  { id: "ai", label: "AI & Prompts", icon: "🤖" },
  { id: "users", label: "Users & Roles", icon: "👥" },
  { id: "security", label: "Security Shield", icon: "🛡" },
];

export default function StudioHubAdminPage() {
  const { refreshSettings, updateLiveColors } = useSiteSettings();

  const [authStatus, setAuthStatus] = useState<
    "loading" | "unauthenticated" | "non-admin" | "admin"
  >("loading");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [claimSecret, setClaimSecret] = useState("");
  const [claiming, setClaiming] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [isDark, setIsDark] = useState(false);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(
    null
  );

  // Settings form state
  const [brandingForm, setBrandingForm] = useState<SiteBrandingSettings>(
    DEFAULT_SETTINGS.branding
  );
  const [plansForm, setPlansForm] = useState<SitePlanSettings>(DEFAULT_SETTINGS.plans);
  const [aiForm, setAiForm] = useState<SiteAiSettings>(DEFAULT_SETTINGS.ai);
  const [structureForm, setStructureForm] = useState<SiteStructureSettings>(
    DEFAULT_SETTINGS.structure
  );

  // Operational data
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [recentUsers, setRecentUsers] = useState<RecentUserRow[]>([]);
  const [courses, setCourses] = useState<AdminCourseItem[]>([]);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [authProvidersStatus, setAuthProvidersStatus] = useState<any>(null);
  const [siteOrigin, setSiteOrigin] = useState("https://courseyl.vercel.app");
  const [testEmailTarget, setTestEmailTarget] = useState("");
  const [testingMailer, setTestingMailer] = useState(false);
  const [copiedCallback, setCopiedCallback] = useState<string | null>(null);
  const [authSecretsForm, setAuthSecretsForm] = useState<AuthSecretsForm>({
    githubClientId: "",
    githubClientSecret: "",
    xClientId: "",
    xClientSecret: "",
    resendApiKey: "",
    smtpHost: "",
    smtpPort: 587,
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
  });

  const showToast = useCallback((type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => {
      setToast((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  }, []);

  const loadAllAdminData = useCallback(async () => {
    try {
      const [settingsRes, metricsRes, coursesRes, usersRes] = await Promise.all([
        fetch("/api/admin/settings", { cache: "no-store" }),
        fetch("/api/admin/metrics", { cache: "no-store" }),
        fetch("/api/admin/courses", { cache: "no-store" }),
        fetch("/api/admin/users", { cache: "no-store" }),
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        const s: FullSiteSettings | undefined = sData?.settings;
        if (s) {
          setBrandingForm({ ...DEFAULT_SETTINGS.branding, ...s.branding });
          setPlansForm({ ...DEFAULT_SETTINGS.plans, ...s.plans });
          setAiForm({ ...DEFAULT_SETTINGS.ai, ...s.ai });
          setStructureForm({ ...DEFAULT_SETTINGS.structure, ...(s.structure || {}) });
        }
        if (sData?.authProviders) {
          setAuthProvidersStatus(sData.authProviders);
        }
        if (sData?.authSecrets) {
          setAuthSecretsForm((prev) => ({
            ...prev,
            githubClientId: sData.authSecrets.githubClientId || "",
            githubClientSecret: sData.authSecrets.githubHasSecret ? "••••••••••••" : "",
            xClientId: sData.authSecrets.xClientId || "",
            xClientSecret: sData.authSecrets.xHasSecret ? "••••••••••••" : "",
            resendApiKey: sData.authSecrets.hasResendKey ? "••••••••••••" : "",
            smtpHost: sData.authSecrets.smtpHost || "",
            smtpPort: sData.authSecrets.smtpPort || 587,
            smtpUser: sData.authSecrets.smtpUser || "",
            smtpPass: sData.authSecrets.smtpHasPass ? "••••••••••••" : "",
            smtpFrom: sData.authSecrets.smtpFrom || "",
          }));
        }
      }

      if (metricsRes.ok) {
        const mData = await metricsRes.json();
        setMetrics(mData.metrics || null);
        setRecentUsers(mData.recentUsers || []);
      }

      if (coursesRes.ok) {
        const cData = await coursesRes.json();
        setCourses(cData.courses || []);
      }

      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
      }
    } catch {
      showToast("error", "Could not sync some admin panels.");
    }
  }, [showToast]);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    if (typeof window !== "undefined") {
      setSiteOrigin(window.location.origin);
    }
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.authenticated || !data.user) {
          setAuthStatus("unauthenticated");
          return;
        }
        setCurrentUser(data.user);
        setTestEmailTarget((prev) => prev || data.user.email || "");
        if (data.user.role === "ADMIN") {
          setAuthStatus("admin");
          loadAllAdminData();
        } else {
          setAuthStatus("non-admin");
        }
      })
      .catch(() => setAuthStatus("unauthenticated"));
  }, [loadAllAdminData]);

  const toggleTheme = () => {
    const currentlyDark = document.documentElement.classList.contains("dark");
    if (currentlyDark) {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      document.documentElement.style.colorScheme = "light";
      localStorage.setItem("theme", "light");
      setIsDark(false);
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      document.documentElement.style.colorScheme = "dark";
      localStorage.setItem("theme", "dark");
      setIsDark(true);
    }
  };

  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaiming(true);
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: claimSecret }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Invalid vault passphrase.");
        return;
      }
      window.location.reload();
    } catch {
      showToast("error", "Network error unlocking Admin Vault.");
    } finally {
      setClaiming(false);
    }
  };

  const applyGmailSmtpPreset = () => {
    const adminEmail = currentUser?.email || authSecretsForm.smtpUser || "";
    setAuthSecretsForm((prev) => ({
      ...prev,
      smtpHost: "smtp.gmail.com",
      smtpPort: 465,
      smtpUser: prev.smtpUser || adminEmail,
      smtpFrom:
        prev.smtpFrom ||
        (adminEmail ? `${brandingForm.brandName || "Courseyl"} <${adminEmail}>` : ""),
    }));
    showToast(
      "success",
      "Gmail SMTP preset applied! Now enter your 16-digit Google App Password and click Save & Send Test."
    );
  };

  const copyCallbackUrl = async (key: string, path: string) => {
    const fullUrl = `${siteOrigin}${path}`;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedCallback(key);
      setTimeout(() => setCopiedCallback(null), 2000);
    } catch {
      showToast("error", `Copy URL manually: ${fullUrl}`);
    }
  };

  const handleSendTestEmail = async () => {
    setTestingMailer(true);
    try {
      const res = await fetch("/api/admin/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: testEmailTarget || currentUser?.email,
          secrets: authSecretsForm,
        }),
      });
      const data = await res.json();
      if (data?.authProviders) {
        setAuthProvidersStatus(data.authProviders);
      }
      if (!res.ok) {
        showToast("error", data?.error || "Test email failed.");
        return;
      }
      showToast("success", data.message || "Test confirmation email sent!");
    } catch {
      showToast("error", "Network error while sending test email.");
    } finally {
      setTestingMailer(false);
    }
  };

  const saveCategory = async (
    category:
      | "site_branding"
      | "site_plans"
      | "site_ai"
      | "site_structure"
      | "site_auth_secrets",
    payload: any,
    customSuccessMsg?: string
  ) => {
    setSavingCategory(category);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, data: payload }),
      });
      const data = await res.json();
      if (!res.ok) {
        showToast("error", data.error || "Failed to save settings.");
        return;
      }
      if (data?.authProviders) setAuthProvidersStatus(data.authProviders);
      await refreshSettings();
      showToast("success", customSuccessMsg || data.message || "Saved & live site-wide!");
    } catch {
      showToast("error", "Failed to reach admin settings API.");
    } finally {
      setSavingCategory(null);
    }
  };

  // ONE-CLICK FREE <-> PAID PLATFORM MODE SWITCH
  const handleOneClickModeSwitch = async (enableFreeMode: boolean) => {
    const nextPlans: SitePlanSettings = {
      ...plansForm,
      unlimitedFreeMode: enableFreeMode,
      freeHoursLimit: enableFreeMode
        ? plansForm.freeHoursLimit
        : plansForm.freeHoursLimit >= 999
        ? 5
        : plansForm.freeHoursLimit,
      freeGenerationsLimit: enableFreeMode
        ? plansForm.freeGenerationsLimit
        : plansForm.freeGenerationsLimit >= 999
        ? 5
        : plansForm.freeGenerationsLimit,
    };
    setPlansForm(nextPlans);
    await saveCategory(
      "site_plans",
      nextPlans,
      enableFreeMode
        ? "🎉 Full Free Mode activated! All users now have unlimited free access."
        : "💎 Monetized Paid Mode activated! Tier pricing & hour limits are now live."
    );
  };

  const handleToggleQuickPlanFlag = async (
    key: "allowNewSignups" | "maintenanceMode"
  ) => {
    const nextPlans = { ...plansForm, [key]: !plansForm[key] };
    setPlansForm(nextPlans);
    await saveCategory(
      "site_plans",
      nextPlans,
      key === "maintenanceMode"
        ? nextPlans.maintenanceMode
          ? "Maintenance overlay enabled for visitors."
          : "Platform restored to live access."
        : nextPlans.allowNewSignups
        ? "New user signups unlocked."
        : "New user signups paused."
    );
  };

  const handleUpdateUser = async (
    targetUserId: string,
    updates: { role?: string; tier?: string; emailVerified?: boolean }
  ) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, ...updates }),
      });
      if (!res.ok) {
        const d = await res.json();
        showToast("error", d.error || "Failed to update user.");
        return;
      }
      showToast("success", "User permissions updated.");
      const uRes = await fetch("/api/admin/users", { cache: "no-store" });
      if (uRes.ok) {
        const uData = await uRes.json();
        setUsers(uData.users || []);
      }
    } catch {
      showToast("error", "Error updating user.");
    }
  };

  const refreshCourses = async () => {
    const res = await fetch("/api/admin/courses", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setCourses(data.courses || []);
    }
  };

  // --- Auth Screens Styled Like Courseyl ---
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
        <div className="flex items-center gap-3 rounded-full bg-surface px-6 py-3 shadow-[0_0_0_1px_var(--line)] text-sm font-medium text-ink-soft">
          <span className="size-2.5 rounded-full bg-moss animate-ping" />
          Authenticating Studio Hub...
        </div>
      </div>
    );
  }

  if (authStatus === "unauthenticated") {
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[28px] bg-surface p-8 shadow-[0_0_0_1px_var(--line)] text-center space-y-5">
          <CourseItLogo size="lg" />
          <div className="space-y-2">
            <h1 className="text-2xl font-display font-bold text-ink">
              Admin Sign-In Required
            </h1>
            <p className="text-sm text-ink-soft">
              Please sign in with an authorized account to unlock the autonomous control hub.
            </p>
          </div>
          <Link
            href="/login?next=/studio-hub"
            className="inline-flex w-full items-center justify-center h-12 rounded-full bg-moss text-on-moss font-semibold text-sm hover:bg-moss-dark transition-colors"
          >
            Sign in to Studio Hub →
          </Link>
        </div>
      </div>
    );
  }

  if (authStatus === "non-admin") {
    return (
      <div className="min-h-screen bg-paper text-ink flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-[28px] bg-surface p-8 shadow-[0_0_0_1px_var(--line)] space-y-6">
          <div className="flex items-center justify-between">
            <CourseItLogo size="default" />
            <span className="px-3 py-1 rounded-full bg-lime-soft text-pill-ink text-xs font-mono font-semibold">
              Security Vault
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl font-display font-bold text-ink">
              Unlock Autonomous <em className="italic text-moss font-serif">Admin Hub</em>
            </h1>
            <p className="text-xs sm:text-sm text-ink-soft">
              Signed in as <strong className="text-ink">{currentUser?.email}</strong>. Enter your Vault Key to elevate this account to Administrator.
            </p>
          </div>

          {toast && (
            <div className="p-3 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-semibold">
              {toast.text}
            </div>
          )}

          <form onSubmit={handleClaimAdmin} className="space-y-4">
            <input
              type="password"
              value={claimSecret}
              onChange={(e) => setClaimSecret(e.target.value)}
              placeholder="Enter Admin Vault Key..."
              required
              className="w-full h-11 rounded-xl bg-paper px-4 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none focus:ring-2 focus:ring-moss/30"
            />
            <button
              type="submit"
              disabled={claiming}
              className="w-full h-11 rounded-full bg-moss text-on-moss font-semibold text-sm hover:bg-moss-dark transition-colors disabled:opacity-50 cursor-pointer"
            >
              {claiming ? "Verifying Vault Key..." : "Unlock Studio Hub"}
            </button>
          </form>

          <div className="text-center pt-1">
            <Link href="/dashboard" className="text-xs font-medium text-ink-soft hover:text-ink">
              ← Back to Learner Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isFreeMode = plansForm.unlimitedFreeMode === true;
  const curr = plansForm.currencySymbol || "$";
  const proYearlyDisplay =
    plansForm.proPriceYearly ?? Math.max(1, Math.round(plansForm.proPriceMonthly * 0.8));
  const maxYearlyDisplay =
    plansForm.maxPriceYearly ?? Math.max(1, Math.round(plansForm.maxPriceMonthly * 0.8));

  const filteredUsers = users.filter((u) => {
    const q = userSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      u.email.toLowerCase().includes(q) || u.displayName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-paper text-ink flex flex-col">
      {/* Top Sticky Courseyl Glass Control Bar */}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <CourseItLogo size="default" href="/studio-hub" />
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-pill-ink">
              ⚡ Autonomous Control
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Live Free/Paid Status Indicator Pill */}
            <button
              type="button"
              onClick={() => handleOneClickModeSwitch(!isFreeMode)}
              disabled={savingCategory === "site_plans"}
              className={`hidden md:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isFreeMode
                  ? "bg-[#b8c460] text-[#0f1611] hover:opacity-90"
                  : "bg-moss text-on-moss hover:bg-moss-dark"
              }`}
              title="Click to switch Full Free Mode / Paid Plans instantly"
            >
              <span className="size-2 rounded-full bg-current animate-pulse" />
              <span>{isFreeMode ? "Full Free Mode ON" : "Paid Plans Active"}</span>
            </button>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle Light/Dark Mode"
              className="size-10 rounded-full bg-surface text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted flex items-center justify-center transition-colors cursor-pointer"
            >
              {isDark ? "☀" : "☾"}
            </button>

            <Link
              href="/dashboard"
              className="px-3.5 py-2 rounded-full bg-surface text-ink text-xs font-semibold shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted transition-colors"
            >
              Dashboard
            </Link>

            <Link
              href="/"
              target="_blank"
              className="px-4 py-2 rounded-full bg-moss text-on-moss text-xs font-semibold hover:bg-moss-dark transition-colors shadow-xs"
            >
              Live Site ↗
            </Link>
          </div>
        </div>
      </header>

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-2xl px-5 py-3.5 shadow-2xl border border-line bg-surface flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3">
          <span
            className={`size-2.5 rounded-full shrink-0 ${
              toast.type === "success" ? "bg-[#76b900]" : "bg-red-500"
            }`}
          />
          <p className="text-xs sm:text-sm font-semibold text-ink">{toast.text}</p>
        </div>
      )}

      {/* Main Responsive Shell: Courseyl Editorial Left Sidebar + Rich Workspace */}
      <div className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 flex flex-col lg:flex-row gap-6">
        {/* Left Navigation Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="lg:sticky lg:top-22 rounded-[26px] bg-sidebar p-3 shadow-[0_0_0_1px_var(--line)] flex lg:flex-col gap-1.5 overflow-x-auto">
            {NAV_TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all cursor-pointer text-left ${
                    active
                      ? "bg-[#b8c460] text-[#0f1611] font-bold shadow-xs"
                      : "text-ink-soft hover:bg-surface/80 hover:text-ink"
                  }`}
                >
                  <span className="text-base leading-none">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <div className="hidden lg:block mt-4 pt-4 border-t border-line px-2 space-y-2">
              <div className="text-[0.65rem] font-mono font-bold uppercase tracking-wider text-ink-soft">
                Logged In Admin
              </div>
              <div className="text-xs font-semibold text-ink truncate">
                {currentUser?.profile?.displayName || currentUser?.email}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Canvas */}
        <main className="flex-1 min-w-0 space-y-8 pb-14">
          {/* ================= OVERVIEW / COMMAND CENTER ================= */}
          {activeTab === "overview" && (
            <div className="space-y-8">
              {/* Hero Greeting & 1-Click Autonomous Master Switch */}
              <div className="rounded-[30px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] flex flex-col xl:flex-row xl:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-wider text-pill-ink">
                    {brandingForm.brandName} · Studio Control Center
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-display font-bold text-ink leading-tight">
                    Control everything from{" "}
                    <em className="italic text-moss font-serif">one rich hub.</em>
                  </h1>
                  <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                    Switch the entire tool between <strong>100% Free Mode</strong> and{" "}
                    <strong>Paid Subscriptions</strong> in one click, build dummy or YouTube
                    courses with custom creator attribution &amp; learners count, and customize
                    every site section.
                  </p>
                </div>

                {/* One-Click Free <-> Paid Switch Box */}
                <div className="rounded-3xl bg-paper p-5 shadow-[0_0_0_1px_var(--line)] min-w-[290px] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-ink-soft">
                      1-Click Monetization Switch
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold ${
                        isFreeMode
                          ? "bg-[#b8c460] text-[#0f1611]"
                          : "bg-moss text-on-moss"
                      }`}
                    >
                      {isFreeMode ? "FREE MODE" : "PAID MODE"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={savingCategory === "site_plans"}
                      onClick={() => handleOneClickModeSwitch(true)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        isFreeMode
                          ? "bg-[#b8c460] text-[#0f1611] shadow-sm ring-2 ring-[#4b5e1e]/30"
                          : "bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink"
                      }`}
                    >
                      🎉 Full Free
                    </button>
                    <button
                      type="button"
                      disabled={savingCategory === "site_plans"}
                      onClick={() => handleOneClickModeSwitch(false)}
                      className={`py-2.5 px-3 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                        !isFreeMode
                          ? "bg-moss text-on-moss shadow-sm"
                          : "bg-surface text-ink-soft shadow-[inset_0_0_0_1px_var(--line)] hover:text-ink"
                      }`}
                    >
                      💎 Paid Plans
                    </button>
                  </div>
                  <p className="text-[0.7rem] text-ink-soft">
                    {isFreeMode
                      ? "All users currently have unlimited hours & courses free."
                      : `Active quotas: Free ${plansForm.freeHoursLimit}h · Pro ${curr}${plansForm.proPriceMonthly}/mo · Max ${curr}${plansForm.maxPriceMonthly}/mo`}
                  </p>
                </div>
              </div>

              {/* Signature Courseyl Connected Lime KPI Cards (Matching /dashboard!) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-xs">
                  <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
                    👥 TOTAL LEARNERS
                  </span>
                  <div className="my-auto py-1">
                    <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none tabular-nums">
                      {metrics?.totalUsers ?? users.length}
                    </h3>
                    <p className="text-xs text-[#0f1611]/75 mt-1.5">
                      {metrics?.proSubscribers ?? 0} Pro / Max accounts
                    </p>
                  </div>
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
                </div>

                <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-xs">
                  <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
                  <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
                    📚 TOTAL COURSES
                  </span>
                  <div className="my-auto py-1">
                    <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none tabular-nums">
                      {metrics?.totalCourses ?? courses.length}
                    </h3>
                    <p className="text-xs text-[#0f1611]/75 mt-1.5">
                      {metrics?.totalLessons ?? 0} lessons across catalog
                    </p>
                  </div>
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
                </div>

                <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-xs">
                  <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
                  <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
                    ⏱ VIDEO HOURS
                  </span>
                  <div className="my-auto py-1">
                    <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none tabular-nums">
                      {metrics?.totalLearningHours ?? 0}h
                    </h3>
                    <p className="text-xs text-[#0f1611]/75 mt-1.5">
                      {metrics?.totalEnrollments ?? 0} active enrollments
                    </p>
                  </div>
                  <div className="hidden lg:block absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
                </div>

                <div className="relative bg-[#b8c460] text-[#0f1611] rounded-3xl p-5 flex flex-col justify-between min-h-[140px] shadow-xs">
                  <div className="hidden lg:block absolute -left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-paper z-10" />
                  <span className="text-[0.65rem] font-bold tracking-widest uppercase font-mono">
                    🤖 AI ENGINE RATE
                  </span>
                  <div className="my-auto py-1">
                    <h3 className="text-3xl sm:text-4xl font-display font-bold leading-none tabular-nums">
                      {metrics?.aiSuccessRate ?? 100}%
                    </h3>
                    <p className="text-xs text-[#0f1611]/75 mt-1.5">
                      {aiForm.activeProvider} active
                    </p>
                  </div>
                </div>
              </div>

              {/* Quick Autonomous Action Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <button
                  type="button"
                  onClick={() => setActiveTab("courses")}
                  className="text-left rounded-[26px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] hover:border-moss/50 hover:-translate-y-0.5 transition-all cursor-pointer space-y-2"
                >
                  <span className="inline-block px-3 py-1 rounded-full bg-lime-soft text-pill-ink text-xs font-bold">
                    + Course Studio
                  </span>
                  <h3 className="text-lg font-display font-bold text-ink">
                    Add Dummy or YouTube Course
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Set custom <strong>Added By Name</strong> &amp; <strong>Learners Count</strong> in seconds.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("structure")}
                  className="text-left rounded-[26px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] hover:border-moss/50 hover:-translate-y-0.5 transition-all cursor-pointer space-y-2"
                >
                  <span className="inline-block px-3 py-1 rounded-full bg-lime-soft text-pill-ink text-xs font-bold">
                    🧩 Structure Engine
                  </span>
                  <h3 className="text-lg font-display font-bold text-ink">
                    Reorder Sections & Edit Copy
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Move landing page blocks up/down, toggle visibility, and update links/footer.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("branding")}
                  className="text-left rounded-[26px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] hover:border-moss/50 hover:-translate-y-0.5 transition-all cursor-pointer space-y-2"
                >
                  <span className="inline-block px-3 py-1 rounded-full bg-lime-soft text-pill-ink text-xs font-bold">
                    🎨 Brand & Theme
                  </span>
                  <h3 className="text-lg font-display font-bold text-ink">
                    Customize Logo, Fonts & Colors
                  </h3>
                  <p className="text-xs text-ink-soft">
                    Live preview rich botanical/tech themes across both Light &amp; Dark modes.
                  </p>
                </button>
              </div>

              {/* Instant Safety Switches + Recent Users */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="rounded-[26px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] space-y-4">
                  <h3 className="text-lg font-display font-bold text-ink">
                    Instant Platform Switches
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)]">
                      <div>
                        <div className="text-sm font-semibold text-ink">Allow New User Signups</div>
                        <div className="text-xs text-ink-soft">
                          Toggle visitor registration cleanly across email &amp; password signup.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleQuickPlanFlag("allowNewSignups")}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                          plansForm.allowNewSignups
                            ? "bg-moss text-on-moss"
                            : "bg-red-500/15 text-red-600 dark:text-red-400"
                        }`}
                      >
                        {plansForm.allowNewSignups ? "OPEN" : "PAUSED"}
                      </button>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)]">
                      <div>
                        <div className="text-sm font-semibold text-ink">Maintenance Mode Overlay</div>
                        <div className="text-xs text-ink-soft">
                          Pause public visitor access cleanly (Studio Hub stays open for Admin).
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleToggleQuickPlanFlag("maintenanceMode")}
                        className={`px-4 py-1.5 rounded-full text-xs font-bold cursor-pointer transition-colors ${
                          plansForm.maintenanceMode
                            ? "bg-amber-500 text-white"
                            : "bg-lime-soft text-pill-ink"
                        }`}
                      >
                        {plansForm.maintenanceMode ? "MAINTENANCE ON" : "LIVE ONLINE"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[26px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-display font-bold text-ink">Latest Signups</h3>
                    <button
                      type="button"
                      onClick={() => setActiveTab("users")}
                      className="text-xs font-semibold text-moss hover:underline cursor-pointer"
                    >
                      Manage all →
                    </button>
                  </div>
                  <div className="space-y-2.5">
                    {recentUsers.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-ink truncate">{u.email}</div>
                          <div className="text-ink-soft">
                            Joined {new Date(u.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="px-2.5 py-0.5 rounded-full bg-lime-soft text-pill-ink font-mono font-bold">
                            {u.subscription?.tier || "FREE"}
                          </span>
                          <span className="px-2 py-0.5 rounded-full border border-line text-ink-soft font-mono">
                            {u.role}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= PLANS & PRICING TAB ================= */}
          {activeTab === "plans" && (
            <div className="space-y-8">
              {/* Big 1-Click Free <-> Paid Header */}
              <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-pill-ink">
                    Monetization & Quota Control
                  </span>
                  <h2 className="mt-2 text-2xl font-display font-bold text-ink">
                    1-Click Free Mode &{" "}
                    <em className="italic text-moss font-serif">Live Plan Pricing</em>
                  </h2>
                  <p className="text-xs sm:text-sm text-ink-soft mt-1">
                    Updates sync instantly to `/pricing`, `/billing`, `/api/billing`, Sidebar
                    meters, and AI course generation quotas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={savingCategory === "site_plans"}
                    onClick={() => handleOneClickModeSwitch(true)}
                    className={`px-5 py-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      isFreeMode
                        ? "bg-[#b8c460] text-[#0f1611] shadow-md ring-2 ring-[#4b5e1e]"
                        : "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted"
                    }`}
                  >
                    🎉 Enable 100% Free Mode
                  </button>
                  <button
                    type="button"
                    disabled={savingCategory === "site_plans"}
                    onClick={() => handleOneClickModeSwitch(false)}
                    className={`px-5 py-3 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      !isFreeMode
                        ? "bg-moss text-on-moss shadow-md"
                        : "bg-paper text-ink shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted"
                    }`}
                  >
                    💎 Switch to Paid Plans
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Editor Column */}
                <div className="xl:col-span-2 rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-6">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Currency Symbol
                      </label>
                      <input
                        type="text"
                        value={plansForm.currencySymbol || "$"}
                        onChange={(e) =>
                          setPlansForm({ ...plansForm, currencySymbol: e.target.value })
                        }
                        className="w-full h-10 rounded-xl bg-paper px-3 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Free Plan Label
                      </label>
                      <input
                        type="text"
                        value={plansForm.freePlanName || "Free"}
                        onChange={(e) =>
                          setPlansForm({ ...plansForm, freePlanName: e.target.value })
                        }
                        className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Pro Plan Label
                      </label>
                      <input
                        type="text"
                        value={plansForm.proPlanName || "Pro"}
                        onChange={(e) =>
                          setPlansForm({ ...plansForm, proPlanName: e.target.value })
                        }
                        className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Max Plan Label
                      </label>
                      <input
                        type="text"
                        value={plansForm.maxPlanName || "Max"}
                        onChange={(e) =>
                          setPlansForm({ ...plansForm, maxPlanName: e.target.value })
                        }
                        className="w-full h-10 rounded-xl bg-paper px-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                  </div>

                  {/* Tier Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Free */}
                    <div className="rounded-2xl bg-paper p-4 shadow-[inset_0_0_0_1px_var(--line)] space-y-3">
                      <h4 className="font-display font-bold text-ink">
                        {plansForm.freePlanName || "Free"} Tier
                      </h4>
                      <div>
                        <label className="block text-[0.65rem] font-mono uppercase text-ink-soft mb-1">
                          Hours Limit (Paid Mode)
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={plansForm.freeHoursLimit >= 999 ? 5 : plansForm.freeHoursLimit}
                          onChange={(e) =>
                            setPlansForm({
                              ...plansForm,
                              freeHoursLimit: Number(e.target.value),
                            })
                          }
                          className="w-full h-9 rounded-lg bg-surface px-3 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[0.65rem] font-mono uppercase text-ink-soft mb-1">
                          Monthly Builds
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={
                            plansForm.freeGenerationsLimit >= 999
                              ? 5
                              : plansForm.freeGenerationsLimit
                          }
                          onChange={(e) =>
                            setPlansForm({
                              ...plansForm,
                              freeGenerationsLimit: Number(e.target.value),
                            })
                          }
                          className="w-full h-9 rounded-lg bg-surface px-3 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                        />
                      </div>
                    </div>

                    {/* Pro */}
                    <div className="rounded-2xl bg-paper p-4 shadow-[inset_0_0_0_2px_var(--moss)] space-y-3">
                      <h4 className="font-display font-bold text-moss">
                        {plansForm.proPlanName || "Pro"} Tier
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Monthly ({curr})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={plansForm.proPriceMonthly}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                proPriceMonthly: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Yearly /mo ({curr})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={proYearlyDisplay}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                proPriceYearly: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Hours/mo
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={plansForm.proHoursLimit}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                proHoursLimit: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Courses/mo
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={plansForm.proGenerationsLimit}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                proGenerationsLimit: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Max */}
                    <div className="rounded-2xl bg-paper p-4 shadow-[inset_0_0_0_1px_var(--line)] space-y-3">
                      <h4 className="font-display font-bold text-ink">
                        {plansForm.maxPlanName || "Max"} Tier
                      </h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Monthly ({curr})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={plansForm.maxPriceMonthly}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                maxPriceMonthly: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Yearly /mo ({curr})
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={maxYearlyDisplay}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                maxPriceYearly: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Hours/mo
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={plansForm.maxHoursLimit}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                maxHoursLimit: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[0.62rem] font-mono uppercase text-ink-soft mb-1">
                            Courses/mo
                          </label>
                          <input
                            type="number"
                            min={1}
                            value={plansForm.maxGenerationsLimit}
                            onChange={(e) =>
                              setPlansForm({
                                ...plansForm,
                                maxGenerationsLimit: Number(e.target.value),
                              })
                            }
                            className="w-full h-9 rounded-lg bg-surface px-2.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                      Maintenance Banner Message (Shown if Maintenance Mode ON)
                    </label>
                    <input
                      type="text"
                      value={plansForm.maintenanceMessage}
                      onChange={(e) =>
                        setPlansForm({ ...plansForm, maintenanceMessage: e.target.value })
                      }
                      className="w-full h-10 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={savingCategory === "site_plans"}
                      onClick={() =>
                        saveCategory(
                          "site_plans",
                          plansForm,
                          "Plan prices & quotas published live across the site!"
                        )
                      }
                      className="px-6 py-3 rounded-full bg-moss text-on-moss hover:bg-moss-dark font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      {savingCategory === "site_plans"
                        ? "Saving Plans..."
                        : "Save All Prices & Quotas"}
                    </button>
                  </div>
                </div>

                {/* Live Pricing Preview Column */}
                <div className="rounded-[28px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] space-y-4">
                  <div className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-ink-soft">
                    Live /pricing Preview
                  </div>
                  <div className="rounded-2xl bg-paper p-5 shadow-[inset_0_0_0_2px_var(--moss)] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-lg text-ink">
                        {plansForm.proPlanName || "Pro"}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-lime-soft text-moss text-[0.68rem] font-bold">
                        {isFreeMode ? "🎉 Free Now" : "Most Popular"}
                      </span>
                    </div>
                    <div className="text-3xl font-display font-bold text-ink">
                      {isFreeMode ? `${curr}0` : `${curr}${plansForm.proPriceMonthly}`}
                      <span className="text-xs font-normal text-ink-soft"> / month</span>
                    </div>
                    <div className="text-xs text-ink-soft">
                      {isFreeMode
                        ? "All Pro features unlocked 100% free"
                        : `${curr}${proYearlyDisplay}/mo billed yearly · ${plansForm.proHoursLimit}h/mo`}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-paper p-5 shadow-[inset_0_0_0_1px_var(--line)] space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold text-base text-ink">
                        {plansForm.maxPlanName || "Max"}
                      </span>
                      <span className="text-xs font-mono font-bold text-moss">
                        {isFreeMode ? `${curr}0` : `${curr}${plansForm.maxPriceMonthly}/mo`}
                      </span>
                    </div>
                    <p className="text-xs text-ink-soft">
                      {plansForm.maxHoursLimit} hours &amp; {plansForm.maxGenerationsLimit}{" "}
                      generations monthly.
                    </p>
                  </div>

                  <Link
                    href="/pricing"
                    target="_blank"
                    className="inline-flex w-full items-center justify-center h-10 rounded-full border border-line text-xs font-semibold text-ink hover:bg-muted transition-colors"
                  >
                    Open Live Pricing Page ↗
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ================= COURSES & DUMMY STUDIO TAB ================= */}
          {activeTab === "courses" && (
            <AdminCoursesStudio
              courses={courses}
              onRefreshCourses={refreshCourses}
              onToast={showToast}
            />
          )}

          {/* ================= SITE STRUCTURE & COPY TAB ================= */}
          {activeTab === "structure" && (
            <AdminStructureEditor
              structure={structureForm}
              onChange={setStructureForm}
              saving={savingCategory === "site_structure"}
              onSave={(next) =>
                saveCategory(
                  "site_structure",
                  next || structureForm,
                  "Site layout, section order, and copy published!"
                )
              }
            />
          )}

          {/* ================= BRAND, LOGO & THEME TAB ================= */}
          {activeTab === "branding" && (
            <div className="space-y-8">
              <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-pill-ink">
                    Visual Identity Studio
                  </span>
                  <h2 className="mt-2 text-2xl font-display font-bold text-ink">
                    Site Name, Logo,{" "}
                    <em className="italic text-moss font-serif">Rich Palette &amp; Fonts</em>
                  </h2>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setBrandingForm(DEFAULT_SETTINGS.branding);
                      updateLiveColors(
                        DEFAULT_SETTINGS.branding.primaryColor,
                        DEFAULT_SETTINGS.branding.accentColor,
                        DEFAULT_SETTINGS.branding.darkBgColor,
                        DEFAULT_SETTINGS.branding.lightBgColor
                      );
                    }}
                    className="px-4 py-2.5 rounded-full border border-line text-xs font-semibold text-ink-soft hover:text-ink cursor-pointer"
                  >
                    Reset Defaults
                  </button>
                  <button
                    type="button"
                    disabled={savingCategory === "site_branding"}
                    onClick={() =>
                      saveCategory(
                        "site_branding",
                        brandingForm,
                        "Brand, logo & theme colors saved globally!"
                      )
                    }
                    className="px-6 py-2.5 rounded-full bg-moss text-on-moss hover:bg-moss-dark font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {savingCategory === "site_branding" ? "Publishing..." : "Save Branding"}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Platform Brand Name
                      </label>
                      <input
                        type="text"
                        value={brandingForm.brandName}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, brandName: e.target.value })
                        }
                        className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Highlighted End Suffix (e.g. &quot;yl&quot; in Courseyl)
                      </label>
                      <input
                        type="text"
                        value={brandingForm.brandSuffix}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, brandSuffix: e.target.value })
                        }
                        className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Logo Icon Style
                      </label>
                      <select
                        value={brandingForm.logoIcon}
                        onChange={(e) =>
                          setBrandingForm({
                            ...brandingForm,
                            logoIcon: e.target.value as SiteBrandingSettings["logoIcon"],
                          })
                        }
                        className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      >
                        <option value="grad-cap">🎓 Graduation Cap (Default)</option>
                        <option value="sparkles">✨ AI Sparkles</option>
                        <option value="code">💻 Developer Code</option>
                        <option value="rocket">🚀 Launch Rocket</option>
                        <option value="video">▶ Video Playmark</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Custom Logo Image URL (Optional Overrides Icon)
                      </label>
                      <input
                        type="url"
                        value={brandingForm.customLogoUrl}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, customLogoUrl: e.target.value })
                        }
                        placeholder="https://.../logo.png"
                        className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-2">
                      1-Click Rich Color Palettes
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {COLOR_PRESETS.map((preset) => (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => {
                            const next = {
                              ...brandingForm,
                              primaryColor: preset.primary,
                              accentColor: preset.accent,
                              lightBgColor: preset.lightBg,
                              darkBgColor: preset.darkBg,
                            };
                            setBrandingForm(next);
                            updateLiveColors(
                              preset.primary,
                              preset.accent,
                              preset.darkBg,
                              preset.lightBg
                            );
                          }}
                          className="p-2.5 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] hover:border-moss text-left transition-all cursor-pointer space-y-1.5"
                        >
                          <div className="flex gap-1">
                            <span
                              className="w-5 h-5 rounded-full"
                              style={{ background: preset.primary }}
                            />
                            <span
                              className="w-5 h-5 rounded-full"
                              style={{ background: preset.accent }}
                            />
                          </div>
                          <div className="text-[0.7rem] font-bold text-ink leading-tight">
                            {preset.name}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-[0.65rem] font-mono uppercase text-ink-soft mb-1">
                        Primary Color
                      </label>
                      <div className="flex items-center gap-2 rounded-xl bg-paper p-2 shadow-[inset_0_0_0_1px_var(--line)]">
                        <input
                          type="color"
                          value={brandingForm.primaryColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBrandingForm({ ...brandingForm, primaryColor: val });
                            updateLiveColors(
                              val,
                              brandingForm.accentColor,
                              brandingForm.darkBgColor,
                              brandingForm.lightBgColor
                            );
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-ink">
                          {brandingForm.primaryColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-mono uppercase text-ink-soft mb-1">
                        Accent Lime
                      </label>
                      <div className="flex items-center gap-2 rounded-xl bg-paper p-2 shadow-[inset_0_0_0_1px_var(--line)]">
                        <input
                          type="color"
                          value={brandingForm.accentColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBrandingForm({ ...brandingForm, accentColor: val });
                            updateLiveColors(
                              brandingForm.primaryColor,
                              val,
                              brandingForm.darkBgColor,
                              brandingForm.lightBgColor
                            );
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-ink">
                          {brandingForm.accentColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-mono uppercase text-ink-soft mb-1">
                        Light Paper BG
                      </label>
                      <div className="flex items-center gap-2 rounded-xl bg-paper p-2 shadow-[inset_0_0_0_1px_var(--line)]">
                        <input
                          type="color"
                          value={brandingForm.lightBgColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBrandingForm({ ...brandingForm, lightBgColor: val });
                            updateLiveColors(
                              brandingForm.primaryColor,
                              brandingForm.accentColor,
                              brandingForm.darkBgColor,
                              val
                            );
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-ink">
                          {brandingForm.lightBgColor}
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[0.65rem] font-mono uppercase text-ink-soft mb-1">
                        Dark BG
                      </label>
                      <div className="flex items-center gap-2 rounded-xl bg-paper p-2 shadow-[inset_0_0_0_1px_var(--line)]">
                        <input
                          type="color"
                          value={brandingForm.darkBgColor}
                          onChange={(e) => {
                            const val = e.target.value;
                            setBrandingForm({ ...brandingForm, darkBgColor: val });
                            updateLiveColors(
                              brandingForm.primaryColor,
                              brandingForm.accentColor,
                              val,
                              brandingForm.lightBgColor
                            );
                          }}
                          className="w-8 h-8 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-xs font-mono text-ink">
                          {brandingForm.darkBgColor}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Display Font Family
                      </label>
                      <select
                        value={brandingForm.fontFamily}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, fontFamily: e.target.value })
                        }
                        className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f} value={f}>
                            {f}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                        Hero Badge Copy
                      </label>
                      <input
                        type="text"
                        value={brandingForm.badgeText}
                        onChange={(e) =>
                          setBrandingForm({ ...brandingForm, badgeText: e.target.value })
                        }
                        className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                      Hero Sub-Tagline &amp; Meta Description
                    </label>
                    <textarea
                      rows={2}
                      value={brandingForm.subTagline}
                      onChange={(e) =>
                        setBrandingForm({ ...brandingForm, subTagline: e.target.value })
                      }
                      className="w-full rounded-xl bg-paper p-3 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                  </div>
                </div>

                {/* Live Theme Preview Panel */}
                <div className="rounded-[28px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)] space-y-5">
                  <div className="text-[0.68rem] font-mono font-bold uppercase tracking-wider text-ink-soft">
                    Live Identity Preview
                  </div>
                  <div
                    className="rounded-3xl p-6 space-y-4 border border-line"
                    style={{
                      backgroundColor: isDark
                        ? brandingForm.darkBgColor
                        : brandingForm.lightBgColor,
                    }}
                  >
                    <CourseItLogo size="lg" href="/studio-hub" />
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-semibold"
                      style={{
                        backgroundColor: brandingForm.accentColor,
                        color: "#0f1611",
                      }}
                    >
                      {brandingForm.badgeText || "Powered by AI"}
                    </span>
                    <h3
                      className="text-xl font-bold leading-snug text-ink"
                      style={{ fontFamily: `"${brandingForm.fontFamily}", sans-serif` }}
                    >
                      {brandingForm.brandName} turns any video into{" "}
                      <span
                        className="italic font-serif"
                        style={{ color: brandingForm.primaryColor }}
                      >
                        structured mastery.
                      </span>
                    </h3>
                    <button
                      type="button"
                      className="px-5 py-2.5 rounded-full text-white text-xs font-semibold shadow-sm"
                      style={{ backgroundColor: brandingForm.primaryColor }}
                    >
                      Start Learning →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================= AI & PROMPTS TAB ================= */}
          {activeTab === "ai" && (
            <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-pill-ink">
                    Curriculum Engine
                  </span>
                  <h2 className="mt-2 text-2xl font-display font-bold text-ink">
                    AI Model, Temperature &amp;{" "}
                    <em className="italic text-moss font-serif">Prompt Control</em>
                  </h2>
                </div>
                <button
                  type="button"
                  disabled={savingCategory === "site_ai"}
                  onClick={() =>
                    saveCategory("site_ai", aiForm, "AI model configuration saved!")
                  }
                  className="px-6 py-2.5 rounded-full bg-moss text-on-moss hover:bg-moss-dark font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {savingCategory === "site_ai" ? "Saving..." : "Save AI Config"}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Active Provider
                  </label>
                  <select
                    value={aiForm.activeProvider}
                    onChange={(e) => setAiForm({ ...aiForm, activeProvider: e.target.value })}
                    className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  >
                    <option value="NVIDIA_NEMOTRON">NVIDIA Nemotron (Recommended)</option>
                    <option value="OPENAI">OpenAI GPT-4o</option>
                    <option value="GOOGLE_GEMINI">Google Gemini</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    value={aiForm.modelName}
                    onChange={(e) => setAiForm({ ...aiForm, modelName: e.target.value })}
                    className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                    Temperature ({aiForm.temperature})
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={aiForm.temperature}
                    onChange={(e) =>
                      setAiForm({ ...aiForm, temperature: Number(e.target.value) })
                    }
                    className="w-full mt-3 accent-[#4b5e1e]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                  Override API Key (Leave blank to keep server `.env` key)
                </label>
                <input
                  type="password"
                  value={aiForm.apiKey}
                  onChange={(e) => setAiForm({ ...aiForm, apiKey: e.target.value })}
                  placeholder="nvapi-... or sk-..."
                  className="w-full h-11 rounded-xl bg-paper px-3.5 text-sm font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>

              <div>
                <label className="block text-[0.68rem] font-mono font-bold uppercase text-ink-soft mb-1">
                  System Prompt Custom Override (Optional)
                </label>
                <textarea
                  rows={4}
                  value={aiForm.systemPromptOverride}
                  onChange={(e) =>
                    setAiForm({ ...aiForm, systemPromptOverride: e.target.value })
                  }
                  placeholder="Optional custom instructions appended to curriculum generation..."
                  className="w-full rounded-xl bg-paper p-3.5 text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>
            </div>
          )}

          {/* ================= USERS & ROLES TAB ================= */}
          {activeTab === "users" && (
            <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-display font-bold text-ink">
                    Platform Learners ({users.length})
                  </h2>
                  <p className="text-xs text-ink-soft">
                    Promote administrators or manually grant Free / Pro / Max plan tiers instantly.
                  </p>
                </div>
                <input
                  type="search"
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  placeholder="Search email or display name..."
                  className="w-full sm:w-72 h-10 rounded-full bg-paper px-4 text-xs sm:text-sm text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-line text-[0.68rem] font-mono uppercase text-ink-soft">
                      <th className="py-3 pr-4">User</th>
                      <th className="py-3 px-4">Verification</th>
                      <th className="py-3 px-4">Activity</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 pl-4">Plan Tier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredUsers.map((u) => (
                      <tr key={u.id} className="hover:bg-paper/60 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div className="font-semibold text-ink">{u.displayName}</div>
                          <div className="text-xs text-ink-soft">{u.email}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateUser(u.id, {
                                emailVerified: !(u.emailVerified ?? false),
                              })
                            }
                            className={`px-2.5 py-1 rounded-full text-[0.68rem] font-mono font-bold uppercase cursor-pointer transition-colors ${
                              u.emailVerified
                                ? "bg-ok-bg text-ok-fg"
                                : "bg-warn-bg text-warn-fg"
                            }`}
                          >
                            {u.emailVerified ? `✓ ${u.authProvider || "email"}` : "Pending"}
                          </button>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-ink-soft font-mono">
                          {u.coursesCreated} built · {u.coursesEnrolled} enrolled · {u.notesCount} notes
                        </td>
                        <td className="py-3.5 px-4">
                          <select
                            value={u.role}
                            onChange={(e) => handleUpdateUser(u.id, { role: e.target.value })}
                            className="h-8 rounded-lg bg-paper px-2.5 text-xs font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)]"
                          >
                            <option value="USER">USER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                        </td>
                        <td className="py-3.5 pl-4">
                          <select
                            value={u.tier}
                            onChange={(e) => handleUpdateUser(u.id, { tier: e.target.value })}
                            className="h-8 rounded-lg bg-paper px-2.5 text-xs font-semibold text-ink shadow-[inset_0_0_0_1px_var(--line)]"
                          >
                            <option value="FREE">FREE</option>
                            <option value="PRO">PRO</option>
                            <option value="MAX">MAX</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================= SECURITY & AUTH TAB ================= */}
          {activeTab === "security" && (
            <div className="space-y-6">
              <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-lime-soft px-3 py-1 font-mono text-[0.68rem] font-bold uppercase tracking-wider text-pill-ink">
                      Authentication &amp; Shield
                    </span>
                    <h2 className="mt-2 text-2xl font-display font-bold text-ink">
                      Real OAuth Providers &amp;{" "}
                      <em className="italic text-moss font-serif">Email Verification</em>
                    </h2>
                  </div>
                  <button
                    type="button"
                    disabled={savingCategory === "site_auth_secrets"}
                    onClick={() =>
                      saveCategory(
                        "site_auth_secrets",
                        authSecretsForm,
                        "OAuth & Email delivery credentials saved!"
                      )
                    }
                    className="px-6 py-2.5 rounded-full bg-moss text-on-moss hover:bg-moss-dark font-semibold text-sm shadow-sm cursor-pointer disabled:opacity-50"
                  >
                    {savingCategory === "site_auth_secrets"
                      ? "Saving..."
                      : "Save Auth Credentials"}
                  </button>
                </div>

                {/* Live Provider Readiness Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                  <div className="p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                    <div className="text-[0.68rem] font-mono font-bold uppercase text-ink-soft">
                      Google OAuth
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {authProvidersStatus?.google?.enabled ? "● Active (Direct)" : "○ Needs Keys"}
                    </div>
                    <div className="text-[0.68rem] text-ink-soft font-mono break-all">
                      {siteOrigin}/api/auth/google/callback
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCallbackUrl("google", "/api/auth/google/callback")}
                      className="text-[0.68rem] font-semibold text-moss hover:underline cursor-pointer"
                    >
                      {copiedCallback === "google" ? "✓ Copied Google Callback URL" : "Copy Google Callback URL"}
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                    <div className="text-[0.68rem] font-mono font-bold uppercase text-ink-soft">
                      GitHub OAuth
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {authProvidersStatus?.github?.enabled
                        ? `● Active (${authProvidersStatus.github.mode})`
                        : "○ Needs Client ID/Secret"}
                    </div>
                    <div className="text-[0.68rem] text-ink-soft font-mono break-all">
                      {siteOrigin}/api/auth/github/callback
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCallbackUrl("github", "/api/auth/github/callback")}
                      className="text-[0.68rem] font-semibold text-moss hover:underline cursor-pointer"
                    >
                      {copiedCallback === "github" ? "✓ Copied GitHub Callback URL" : "Copy GitHub Callback URL"}
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                    <div className="text-[0.68rem] font-mono font-bold uppercase text-ink-soft">
                      X (Twitter) OAuth
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {authProvidersStatus?.x?.enabled
                        ? `● Active (${authProvidersStatus.x.mode})`
                        : "○ Needs Client ID/Secret"}
                    </div>
                    <div className="text-[0.68rem] text-ink-soft font-mono break-all">
                      {siteOrigin}/api/auth/x/callback
                    </div>
                    <button
                      type="button"
                      onClick={() => copyCallbackUrl("x", "/api/auth/x/callback")}
                      className="text-[0.68rem] font-semibold text-moss hover:underline cursor-pointer"
                    >
                      {copiedCallback === "x" ? "✓ Copied X Callback URL" : "Copy X Callback URL"}
                    </button>
                  </div>
                  <div className="p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                    <div className="text-[0.68rem] font-mono font-bold uppercase text-ink-soft">
                      Email Confirmation
                    </div>
                    <div className="text-sm font-bold text-ink">
                      {authProvidersStatus?.email?.mode === "custom"
                        ? "● Custom Mailer Active"
                        : "⚠ Supabase Default (Add SMTP)"}
                    </div>
                    <div className="text-[0.68rem] text-ink-soft">
                      Typo/dummy/MX check + 6-digit OTP
                    </div>
                  </div>
                </div>

                {/* OAuth Credentials Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-line">
                  <div className="space-y-3 p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)]">
                    <div className="text-xs font-mono font-bold uppercase text-moss">
                      GitHub OAuth App
                    </div>
                    <input
                      type="text"
                      value={authSecretsForm.githubClientId}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          githubClientId: e.target.value,
                        })
                      }
                      placeholder="GitHub Client ID (Ov23li...)"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="password"
                      value={authSecretsForm.githubClientSecret}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          githubClientSecret: e.target.value,
                        })
                      }
                      placeholder="GitHub Client Secret"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                  </div>

                  <div className="space-y-3 p-4 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)]">
                    <div className="text-xs font-mono font-bold uppercase text-moss">
                      X (Twitter) OAuth 2.0 App
                    </div>
                    <input
                      type="text"
                      value={authSecretsForm.xClientId}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          xClientId: e.target.value,
                        })
                      }
                      placeholder="X OAuth 2.0 Client ID"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="password"
                      value={authSecretsForm.xClientSecret}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          xClientSecret: e.target.value,
                        })
                      }
                      placeholder="X OAuth 2.0 Client Secret"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                  </div>
                </div>

                {/* Custom Email Mailer (Resend / SMTP) */}
                <div className="space-y-4 p-4 sm:p-5 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)]">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs font-mono font-bold uppercase text-moss">
                      Custom Confirmation Mailer (Gmail SMTP or Resend API)
                    </div>
                    <button
                      type="button"
                      onClick={applyGmailSmtpPreset}
                      className="px-3.5 py-1.5 rounded-full bg-surface text-ink hover:bg-moss hover:text-on-moss text-xs font-semibold shadow-[inset_0_0_0_1px_var(--line)] transition-colors cursor-pointer"
                    >
                      ⚡ Use Free Gmail SMTP Preset
                    </button>
                  </div>
                  <p className="text-xs text-ink-soft leading-relaxed">
                    Supabase free default mail has strict limits &amp; bounce warnings. Using Gmail SMTP (<code className="font-mono">smtp.gmail.com</code>, port <code className="font-mono">465</code> + Google App Password) or Resend API sends branded 6-digit OTPs directly from your account with zero Supabase limits.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="password"
                      value={authSecretsForm.resendApiKey}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          resendApiKey: e.target.value,
                        })
                      }
                      placeholder="Resend API Key (re_...) — Optional if using Gmail SMTP"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="text"
                      value={authSecretsForm.smtpFrom}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          smtpFrom: e.target.value,
                        })
                      }
                      placeholder="From Email (e.g. Courseyl <you@gmail.com>)"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="text"
                      value={authSecretsForm.smtpHost}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          smtpHost: e.target.value,
                        })
                      }
                      placeholder="SMTP Host (smtp.gmail.com)"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="number"
                      value={authSecretsForm.smtpPort}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          smtpPort: Number(e.target.value) || 465,
                        })
                      }
                      placeholder="SMTP Port (465 for Gmail SSL, or 587)"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="text"
                      value={authSecretsForm.smtpUser}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          smtpUser: e.target.value,
                        })
                      }
                      placeholder="SMTP Username (your@gmail.com)"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <input
                      type="password"
                      value={authSecretsForm.smtpPass}
                      onChange={(e) =>
                        setAuthSecretsForm({
                          ...authSecretsForm,
                          smtpPass: e.target.value,
                        })
                      }
                      placeholder="16-char Google App Password / SMTP Password"
                      className="w-full h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                  </div>

                  {/* Save & Test Email Verification Bar */}
                  <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-line/70">
                    <input
                      type="email"
                      value={testEmailTarget}
                      onChange={(e) => setTestEmailTarget(e.target.value)}
                      placeholder="Recipient email to test (e.g. your@gmail.com)"
                      className="flex-1 h-10 rounded-xl bg-surface px-3 text-xs font-mono text-ink shadow-[inset_0_0_0_1px_var(--line)] outline-none"
                    />
                    <button
                      type="button"
                      disabled={testingMailer}
                      onClick={handleSendTestEmail}
                      className="px-5 h-10 rounded-full bg-surface text-ink hover:bg-moss hover:text-on-moss font-semibold text-xs shadow-[inset_0_0_0_1px_var(--line)] transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      {testingMailer
                        ? "Sending Test..."
                        : "Save & Send Test Email →"}
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] bg-surface p-6 sm:p-8 shadow-[0_0_0_1px_var(--line)] grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                  <div className="text-xs font-mono font-bold uppercase text-moss">● Stealth Decoy</div>
                  <div className="font-semibold text-sm text-ink">`/admin` Route Blocked (404)</div>
                  <p className="text-xs text-ink-soft">
                    Public `/admin` probes return HTTP 404; administrative controls live at `/studio-hub`.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                  <div className="text-xs font-mono font-bold uppercase text-moss">● RBAC Guard</div>
                  <div className="font-semibold text-sm text-ink">Strict ADMIN Session Gate</div>
                  <p className="text-xs text-ink-soft">
                    All `/api/admin/*` endpoints verify signed JWT + live `ADMIN` role on PostgreSQL.
                  </p>
                </div>
                <div className="p-5 rounded-2xl bg-paper shadow-[inset_0_0_0_1px_var(--line)] space-y-1.5">
                  <div className="text-xs font-mono font-bold uppercase text-moss">● Zero Spoof Auth</div>
                  <div className="font-semibold text-sm text-ink">Cryptographic Verification Only</div>
                  <p className="text-xs text-ink-soft">
                    Unverified emails, throwaway domains, and forged OAuth tokens are strictly rejected.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
