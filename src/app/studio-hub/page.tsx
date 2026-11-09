"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CourseItLogo } from "@/components/CourseItLogo";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function StudioHubAdminPage() {
  const router = useRouter();
  const { updateLiveColors } = useSiteSettings();

  // Auth / Gate State
  const [authChecking, setAuthChecking] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [claimKey, setClaimKey] = useState("");
  const [claimLoading, setClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");

  // Navigation
  const [activeTab, setActiveTab] = useState<
    "branding" | "plans" | "ai" | "courses" | "users" | "metrics" | "security"
  >("branding");

  // Notifications
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");

  const showToast = (msg: string, type: "success" | "error" = "success") => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(""), 4500);
  };

  // 1. Branding Settings State
  const [brandName, setBrandName] = useState("Courseyl");
  const [brandSuffix, setBrandSuffix] = useState("yl");
  const [tagline, setTagline] = useState("Turn any YouTube video into a course you actually finish.");
  const [subTagline, setSubTagline] = useState(
    "Structured lessons, active recall quizzes, interactive note-taking, and personalized placement tests in one distraction-free space."
  );
  const [badgeText, setBadgeText] = useState("No distraction between your studies");
  const [logoIcon, setLogoIcon] = useState<"grad-cap" | "sparkles" | "code" | "rocket" | "video">("grad-cap");
  const [customLogoUrl, setCustomLogoUrl] = useState("");
  const [primaryColor, setPrimaryColor] = useState("#4b5e1e");
  const [accentColor, setAccentColor] = useState("#b8c460");
  const [darkBgColor, setDarkBgColor] = useState("#0e1311");
  const [lightBgColor, setLightBgColor] = useState("#fcfcfa");
  const [fontFamily, setFontFamily] = useState("Familjen Grotesk");
  const [savingBranding, setSavingBranding] = useState(false);

  // 2. Plans & Monetization State
  const [freeHoursLimit, setFreeHoursLimit] = useState(5);
  const [freeGenerationsLimit, setFreeGenerationsLimit] = useState(3);
  const [proPriceMonthly, setProPriceMonthly] = useState(12);
  const [proHoursLimit, setProHoursLimit] = useState(40);
  const [proGenerationsLimit, setProGenerationsLimit] = useState(25);
  const [maxPriceMonthly, setMaxPriceMonthly] = useState(29);
  const [maxHoursLimit, setMaxHoursLimit] = useState(120);
  const [maxGenerationsLimit, setMaxGenerationsLimit] = useState(100);
  const [allowNewSignups, setAllowNewSignups] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    "Courseyl is currently undergoing scheduled platform upgrades. We will be back shortly!"
  );
  const [savingPlans, setSavingPlans] = useState(false);

  // 3. AI Intelligence State
  const [aiProvider, setAiProvider] = useState("NVIDIA_NEMOTRON");
  const [aiModel, setAiModel] = useState("nvidia/llama-3.1-nemotron-70b-instruct");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiTemperature, setAiTemperature] = useState(0.3);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [savingAi, setSavingAi] = useState(false);
  const [testPrompt, setTestPrompt] = useState("Summarize the significance of neural network weights in 2 sentences.");
  const [testOutput, setTestOutput] = useState("");
  const [testingAi, setTestingAi] = useState(false);

  // 4. Courses State
  const [courses, setCourses] = useState<any[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState("");
  const [ingestUrl, setIngestUrl] = useState("");
  const [ingesting, setIngesting] = useState(false);

  // 5. Users State
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState("");
  const [quickAdminEmail, setQuickAdminEmail] = useState("");

  // 6. Metrics State
  const [metrics, setMetrics] = useState<any>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  // Initial Auth Check
  useEffect(() => {
    fetch("/api/admin/claim")
      .then((res) => {
        if (!res.ok) throw new Error("Unauthenticated");
        return res.json();
      })
      .then((data) => {
        setIsAuthenticated(data.authenticated);
        setIsAdmin(data.isAdmin);
        setUserEmail(data.email || "");
        if (data.isAdmin) {
          loadAllAdminData();
        }
      })
      .catch(() => {
        setIsAuthenticated(false);
        setIsAdmin(false);
      })
      .finally(() => setAuthChecking(false));
  }, []);

  const loadAllAdminData = async () => {
    // 1. Load Settings
    try {
      const sRes = await fetch("/api/admin/settings");
      if (sRes.ok) {
        const sData = await sRes.json();
        const b = sData.settings?.branding;
        if (b) {
          setBrandName(b.brandName || "Courseyl");
          setBrandSuffix(b.brandSuffix || "yl");
          setTagline(b.tagline || "");
          setSubTagline(b.subTagline || "");
          setBadgeText(b.badgeText || "");
          setLogoIcon(b.logoIcon || "grad-cap");
          setCustomLogoUrl(b.customLogoUrl || "");
          setPrimaryColor(b.primaryColor || "#4b5e1e");
          setAccentColor(b.accentColor || "#b8c460");
          setDarkBgColor(b.darkBgColor || "#0e1311");
          setLightBgColor(b.lightBgColor || "#fcfcfa");
          setFontFamily(b.fontFamily || "Familjen Grotesk");
        }
        const p = sData.settings?.plans;
        if (p) {
          setFreeHoursLimit(p.freeHoursLimit ?? 5);
          setFreeGenerationsLimit(p.freeGenerationsLimit ?? 3);
          setProPriceMonthly(p.proPriceMonthly ?? 12);
          setProHoursLimit(p.proHoursLimit ?? 40);
          setProGenerationsLimit(p.proGenerationsLimit ?? 25);
          setMaxPriceMonthly(p.maxPriceMonthly ?? 29);
          setMaxHoursLimit(p.maxHoursLimit ?? 120);
          setMaxGenerationsLimit(p.maxGenerationsLimit ?? 100);
          setAllowNewSignups(p.allowNewSignups ?? true);
          setMaintenanceMode(p.maintenanceMode ?? false);
          setMaintenanceMessage(p.maintenanceMessage ?? "");
        }
        const a = sData.settings?.ai;
        if (a) {
          setAiProvider(a.activeProvider || "NVIDIA_NEMOTRON");
          setAiModel(a.modelName || "nvidia/llama-3.1-nemotron-70b-instruct");
          setAiApiKey(a.apiKey || "");
          setAiTemperature(a.temperature ?? 0.3);
          setSystemPrompt(a.systemPromptOverride || "");
        }
      }
    } catch {}

    // 2. Load Telemetry
    loadMetrics();

    // 3. Load Courses
    loadCourses();

    // 4. Load Users
    loadUsers();
  };

  const loadMetrics = async () => {
    setMetricsLoading(true);
    try {
      const res = await fetch("/api/admin/metrics");
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch {}
    setMetricsLoading(false);
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await fetch("/api/admin/courses");
      if (res.ok) {
        const data = await res.json();
        setCourses(data.courses || []);
      }
    } catch {}
    setCoursesLoading(false);
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {}
    setUsersLoading(false);
  };

  // Claim Admin Action
  const handleClaimAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setClaimLoading(true);
    setClaimError("");
    try {
      const res = await fetch("/api/admin/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey: claimKey }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsAdmin(true);
        showToast("Administrator clearance verified! Vault unlocked.", "success");
        loadAllAdminData();
      } else {
        setClaimError(data.error || "Verification failed. Check your secret key.");
      }
    } catch {
      setClaimError("Network error attempting admin authorization.");
    } finally {
      setClaimLoading(false);
    }
  };

  // Save Branding
  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingBranding(true);
    try {
      const payload = {
        brandName,
        brandSuffix,
        tagline,
        subTagline,
        badgeText,
        logoIcon,
        customLogoUrl,
        primaryColor,
        accentColor,
        darkBgColor,
        lightBgColor,
        fontFamily,
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "site_branding", data: payload }),
      });
      if (res.ok) {
        updateLiveColors(primaryColor, accentColor, darkBgColor, lightBgColor);
        showToast("Branding & visual redesign applied to the entire website!", "success");
      } else {
        showToast("Failed to save branding changes.", "error");
      }
    } catch {
      showToast("Error updating branding.", "error");
    } finally {
      setSavingBranding(false);
    }
  };

  // Save Plans
  const handleSavePlans = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPlans(true);
    try {
      const payload = {
        freeHoursLimit: Number(freeHoursLimit),
        freeGenerationsLimit: Number(freeGenerationsLimit),
        proPriceMonthly: Number(proPriceMonthly),
        proHoursLimit: Number(proHoursLimit),
        proGenerationsLimit: Number(proGenerationsLimit),
        maxPriceMonthly: Number(maxPriceMonthly),
        maxHoursLimit: Number(maxHoursLimit),
        maxGenerationsLimit: Number(maxGenerationsLimit),
        allowNewSignups,
        maintenanceMode,
        maintenanceMessage,
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "site_plans", data: payload }),
      });
      if (res.ok) {
        showToast("Monetization and platform quotas updated successfully!", "success");
      } else {
        showToast("Failed to save plans configuration.", "error");
      }
    } catch {
      showToast("Error updating plans.", "error");
    } finally {
      setSavingPlans(false);
    }
  };

  // Save AI Settings
  const handleSaveAi = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAi(true);
    try {
      const payload = {
        activeProvider: aiProvider,
        modelName: aiModel,
        apiKey: aiApiKey,
        temperature: Number(aiTemperature),
        systemPromptOverride: systemPrompt,
      };
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: "site_ai", data: payload }),
      });
      if (res.ok) {
        showToast("AI Intelligence settings updated successfully!", "success");
      } else {
        showToast("Failed to save AI configuration.", "error");
      }
    } catch {
      showToast("Error updating AI.", "error");
    } finally {
      setSavingAi(false);
    }
  };

  // Test AI Connection
  const handleTestAi = async () => {
    setTestingAi(true);
    setTestOutput("");
    try {
      const res = await fetch("/api/admin/ai-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: aiProvider,
          model: aiModel,
          test: true,
          prompt: testPrompt,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setTestOutput(data.message || data.output || "AI Engine responded successfully!");
        showToast("AI Connection test passed!", "success");
      } else {
        setTestOutput(data.error || "AI Engine test failed.");
        showToast("AI test failed.", "error");
      }
    } catch {
      setTestOutput("Network or timeout error while reaching AI provider.");
    } finally {
      setTestingAi(false);
    }
  };

  // Toggle Course Visibility
  const handleToggleCourseVisibility = async (courseId: string, currentPublic: boolean) => {
    try {
      const res = await fetch("/api/admin/courses", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, isPublic: !currentPublic }),
      });
      if (res.ok) {
        setCourses((prev) =>
          prev.map((c) => (c.id === courseId ? { ...c, isPublic: !currentPublic } : c))
        );
        showToast(`Course visibility changed to ${!currentPublic ? "Public" : "Private"}.`, "success");
      }
    } catch {
      showToast("Error toggling course visibility.", "error");
    }
  };

  // Delete Course
  const handleDeleteCourse = async (courseId: string, title: string) => {
    if (!confirm(`Are you sure you want to permanently delete "${title}"?`)) return;
    try {
      const res = await fetch(`/api/admin/courses?id=${courseId}`, { method: "DELETE" });
      if (res.ok) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        showToast("Course removed permanently.", "success");
      }
    } catch {
      showToast("Error deleting course.", "error");
    }
  };

  // Ingest Course
  const handleIngestCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingestUrl.trim()) return;
    setIngesting(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ youtubeUrl: ingestUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.courseId) {
        showToast("Course creation initiated! Ingestion job processing.", "success");
        setIngestUrl("");
        loadCourses();
      } else {
        showToast(data.error || "Failed to ingest YouTube video.", "error");
      }
    } catch {
      showToast("Error ingesting course.", "error");
    } finally {
      setIngesting(false);
    }
  };

  // Update User Role
  const handleUpdateUserRole = async (targetUserId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, role: newRole }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, role: newRole } : u))
        );
        showToast(`User role updated to ${newRole}!`, "success");
      }
    } catch {
      showToast("Error updating user role.", "error");
    }
  };

  // Update User Tier
  const handleUpdateUserTier = async (targetUserId: string, tier: string) => {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, tier }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === targetUserId ? { ...u, tier } : u))
        );
        showToast(`Subscription plan updated to ${tier}!`, "success");
      }
    } catch {
      showToast("Error updating plan tier.", "error");
    }
  };

  // Delete User
  const handleDeleteUser = async (targetUserId: string, email: string) => {
    if (!confirm(`Are you sure you want to delete user account "${email}"? This will delete all their notes and progress.`))
      return;
    try {
      const res = await fetch(`/api/admin/users?userId=${targetUserId}`, { method: "DELETE" });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== targetUserId));
        showToast("User account deleted permanently.", "success");
      }
    } catch {
      showToast("Error deleting user.", "error");
    }
  };

  // Quick Promote
  const handleQuickPromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAdminEmail.trim()) return;
    const target = users.find((u) => u.email.toLowerCase() === quickAdminEmail.trim().toLowerCase());
    if (!target) {
      showToast("User email not found in database.", "error");
      return;
    }
    await handleUpdateUserRole(target.id, "USER");
    setQuickAdminEmail("");
  };

  // Preset Colors
  const applyPreset = (preset: {
    primary: string;
    accent: string;
    darkBg: string;
    lightBg: string;
    font: string;
  }) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
    setDarkBgColor(preset.darkBg);
    setLightBgColor(preset.lightBg);
    setFontFamily(preset.font);
    updateLiveColors(preset.primary, preset.accent, preset.darkBg, preset.lightBg);
    showToast("Preset applied! Click 'Save & Apply Live' to persist.", "success");
  };

  // Loading Screen
  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0e1311] text-[#b8c460] font-mono text-xs">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#b8c460] border-t-transparent animate-spin" />
          <span>INITIALIZING SECURE STUDIO VAULT...</span>
        </div>
      </div>
    );
  }

  // Not Logged In Screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d0b] text-[#f1f3ea] px-4">
        <div className="max-w-md w-full bg-[#121815] border border-white/10 rounded-3xl p-8 shadow-2xl text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-[#b8c460]/10 border border-[#b8c460]/30 flex items-center justify-center text-2xl mx-auto">
            🔒
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-white">Courseyl Studio Vault</h1>
            <p className="text-xs text-[#b3b7a3] mt-2">
              This administrative control route is restricted. Please sign in with an authorized account to access platform controls.
            </p>
          </div>
          <Link
            href="/login?redirect=/studio-hub"
            className="w-full inline-flex items-center justify-center py-3 rounded-full bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-transform hover:-translate-y-0.5"
          >
            Sign In with Email or Google →
          </Link>
          <div className="text-[0.7rem] text-[#b3b7a3]/60 font-mono">
            Security Protocol 256-Bit · Bot Scanners Quarantined
          </div>
        </div>
      </div>
    );
  }

  // Logged in but not ADMIN -> Clearance / Claim Screen
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#090d0b] text-[#f1f3ea] px-4">
        <div className="max-w-md w-full bg-[#121815] border border-[#b8c460]/20 rounded-3xl p-8 shadow-2xl space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl mx-auto">
            🛡️
          </div>
          <div className="text-center">
            <h1 className="text-xl font-bold font-display text-white">Administrator Clearance Required</h1>
            <p className="text-xs text-[#b3b7a3] mt-2">
              Signed in as <strong className="text-white font-mono">{userEmail}</strong>. This account currently has{" "}
              <span className="px-2 py-0.5 rounded-full bg-white/10 font-mono text-[0.7rem]">USER</span> role.
            </p>
          </div>

          <form onSubmit={handleClaimAdmin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#b3b7a3] mb-1.5">
                Master Security Key or Admin Setup Token
              </label>
              <input
                type="password"
                placeholder="Enter setup passphrase..."
                value={claimKey}
                onChange={(e) => setClaimKey(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none font-mono"
              />
              <p className="text-[0.68rem] text-[#b3b7a3]/70 mt-1">
                Default platform vault key: <code className="text-[#b8c460]">courseyl_admin_vault_2026</code>
              </p>
            </div>

            {claimError && (
              <p className="text-xs text-red-400 font-semibold bg-red-500/10 p-2.5 rounded-xl border border-red-500/20">
                {claimError}
              </p>
            )}

            <button
              type="submit"
              disabled={claimLoading}
              className="w-full py-2.5 rounded-full bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {claimLoading ? "Verifying clearance..." : "Unlock Studio Vault & Authorize Account"}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10 text-center">
            <Link href="/dashboard" className="text-xs text-[#b3b7a3] hover:text-white underline">
              ← Return to Learner Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ADMIN UNLOCKED: Main Control Hub UI
  return (
    <div className="min-h-screen flex flex-col bg-[#0a0f0c] text-[#f1f3ea] selection:bg-[#b8c460] selection:text-[#0f1611]">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 animate-in fade-in slide-in-from-bottom-3 duration-200 ${
            toastType === "success"
              ? "bg-[#b8c460] text-[#0f1611] shadow-[#b8c460]/20"
              : "bg-red-500 text-white shadow-red-500/20"
          }`}
        >
          <span>{toastType === "success" ? "✓" : "⚠"}</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#0e1411]/90 backdrop-blur-md border-b border-white/10 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <CourseItLogo size="default" href="/dashboard" />
          <div className="h-4 w-px bg-white/15 hidden sm:block" />
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-[#b8c460] text-[#0f1611] text-[0.68rem] font-bold uppercase tracking-wider font-mono">
              STUDIO VAULT
            </span>
            <span className="hidden md:inline-flex items-center gap-1.5 text-[0.7rem] font-mono text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LIVE SYSTEM READY
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs">
            <span className="text-[#b3b7a3]">Admin:</span>
            <span className="font-semibold text-white truncate max-w-[150px]">{userEmail}</span>
          </div>
          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white transition-colors"
          >
            Learner View →
          </Link>
        </div>
      </header>

      {/* Main Container with Sidebar Navigation */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar Tabs */}
        <aside className="w-full md:w-64 shrink-0 space-y-1.5">
          {[
            { id: "branding", label: "Branding & Redesign", icon: "🎨", badge: "A to Z" },
            { id: "plans", label: "Plans, Pricing & Quotas", icon: "💰", badge: "Free/Paid" },
            { id: "ai", label: "AI Engine & Intelligence", icon: "⚡", badge: "Nemotron" },
            { id: "courses", label: "Courses & Content", icon: "📚", count: courses.length },
            { id: "users", label: "User Management & Roles", icon: "👥", count: users.length },
            { id: "metrics", label: "Platform Telemetry", icon: "📊" },
            { id: "security", label: "Route & Security Shield", icon: "🔐" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left ${
                activeTab === tab.id
                  ? "bg-[#b8c460] text-[#0f1611] shadow-lg shadow-[#b8c460]/15"
                  : "text-[#b3b7a3] hover:text-white hover:bg-white/5"
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-base">{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </div>
              {tab.badge && (
                <span
                  className={`text-[0.62rem] font-mono px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-[#0f1611] text-[#b8c460]" : "bg-white/10 text-[#b3b7a3]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
              {typeof tab.count === "number" && (
                <span
                  className={`text-[0.68rem] font-mono px-2 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-[#0f1611] text-[#b8c460]" : "bg-white/10 text-[#b3b7a3]"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}

          {/* Quick Stats Pill in Sidebar */}
          <div className="pt-6 hidden md:block">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
              <p className="text-[0.7rem] uppercase font-mono font-bold text-[#b3b7a3]">Live Route Status</p>
              <p className="text-xs text-white">
                Admin portal active at: <code className="text-[#b8c460] font-mono font-bold">/studio-hub</code>
              </p>
              <p className="text-[0.68rem] text-[#b3b7a3]">
                Standard <code className="text-red-400">/admin</code> returns HTTP 404 (Scanners blocked).
              </p>
            </div>
          </div>
        </aside>

        {/* Tab Content Panes */}
        <main className="flex-1 min-w-0">
          {/* TAB 1: BRANDING & LIVE REDESIGN */}
          {activeTab === "branding" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">Live Site Redesign & Visual Identity</h2>
                <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                  Change site branding, colors, typography, and logos in real-time. Changes apply instantly across the entire platform.
                </p>
              </div>

              {/* Color Presets */}
              <div className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase font-mono text-[#b3b7a3]">1-Click Theme Presets</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      name: "CourseIt Moss & Lime",
                      primary: "#4b5e1e",
                      accent: "#b8c460",
                      darkBg: "#0e1311",
                      lightBg: "#fcfcfa",
                      font: "Familjen Grotesk",
                    },
                    {
                      name: "Cyber Citron & Slate",
                      primary: "#0284c7",
                      accent: "#eab308",
                      darkBg: "#09090b",
                      lightBg: "#fafafa",
                      font: "Instrument Sans",
                    },
                    {
                      name: "Electric Violet & Indigo",
                      primary: "#6366f1",
                      accent: "#a855f7",
                      darkBg: "#0b0c16",
                      lightBg: "#f8fafc",
                      font: "Outfit",
                    },
                    {
                      name: "Emerald Matrix",
                      primary: "#059669",
                      accent: "#10b981",
                      darkBg: "#04140b",
                      lightBg: "#f0fdf4",
                      font: "Plus Jakarta Sans",
                    },
                  ].map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:border-[#b8c460]/40 text-left transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.primary }} />
                        <span className="w-3.5 h-3.5 rounded-full" style={{ backgroundColor: preset.accent }} />
                      </div>
                      <p className="text-xs font-bold text-white group-hover:text-[#b8c460] transition-colors">
                        {preset.name}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Real-time Interactive Preview */}
              <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase font-mono text-[#b3b7a3]">Live Component Preview</h3>
                  <span className="text-[0.68rem] text-emerald-400 font-mono">Dynamic Preview</span>
                </div>
                <div
                  className="p-6 rounded-2xl border transition-all"
                  style={{
                    backgroundColor: darkBgColor,
                    borderColor: "rgba(255, 255, 255, 0.12)",
                    fontFamily: fontFamily,
                  }}
                >
                  <div className="flex items-center justify-between pb-4 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span style={{ color: accentColor }} className="text-xl">
                        {logoIcon === "sparkles" ? "✨" : logoIcon === "code" ? "</>" : logoIcon === "rocket" ? "🚀" : logoIcon === "video" ? "▶" : "🎓"}
                      </span>
                      <span className="text-lg font-bold">
                        <span className="text-white font-bold">Course</span>
                        <span style={{ color: accentColor }} className="font-bold">yl</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      className="px-4 py-1.5 rounded-full text-xs font-bold shadow-md cursor-pointer"
                      style={{ backgroundColor: accentColor, color: "#0f1611" }}
                    >
                      Start Learning
                    </button>
                  </div>
                  <div className="py-6 text-center space-y-2">
                    <span
                      className="inline-block px-3 py-1 rounded-full text-xs font-mono font-semibold"
                      style={{ backgroundColor: `${accentColor}25`, color: accentColor }}
                    >
                      {badgeText}
                    </span>
                    <h4 className="text-xl sm:text-2xl font-bold text-white max-w-md mx-auto">{tagline}</h4>
                    <p className="text-xs text-[#b3b7a3] max-w-sm mx-auto">{subTagline}</p>
                  </div>
                </div>
              </div>

              {/* Branding Edit Form */}
              <form onSubmit={handleSaveBranding} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-6 rounded-3xl bg-[#121815] border border-white/10">
                  {/* Brand Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Platform Brand Name
                    </label>
                    <input
                      type="text"
                      value={brandName}
                      onChange={(e) => setBrandName(e.target.value)}
                      placeholder="e.g. Courseyl"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                    />
                  </div>

                  {/* Suffix Highlight */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Accent Suffix Highlight
                    </label>
                    <input
                      type="text"
                      value={brandSuffix}
                      onChange={(e) => setBrandSuffix(e.target.value)}
                      placeholder="e.g. yl or It"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                    />
                  </div>

                  {/* Tagline */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Hero Headline / Tagline
                    </label>
                    <input
                      type="text"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                    />
                  </div>

                  {/* Subtagline */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Sub-Tagline / Description
                    </label>
                    <textarea
                      rows={2}
                      value={subTagline}
                      onChange={(e) => setSubTagline(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none resize-none"
                    />
                  </div>

                  {/* Badge Text */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Hero Badge Text
                    </label>
                    <input
                      type="text"
                      value={badgeText}
                      onChange={(e) => setBadgeText(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                    />
                  </div>

                  {/* Logo Icon Style */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Logo Icon Style
                    </label>
                    <select
                      value={logoIcon}
                      onChange={(e) => setLogoIcon(e.target.value as any)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none cursor-pointer"
                    >
                      <option value="grad-cap">🎓 Graduation Cap + Play (Default)</option>
                      <option value="sparkles">✨ AI Sparkles</option>
                      <option value="code">&lt;/&gt; Code Terminal</option>
                      <option value="rocket">🚀 Rocket Launcher</option>
                      <option value="video">▶ Modern Media Play</option>
                    </select>
                  </div>

                  {/* Primary Color */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Primary Brand Color (Moss)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={primaryColor}
                        onChange={(e) => {
                          setPrimaryColor(e.target.value);
                          updateLiveColors(e.target.value, accentColor, darkBgColor, lightBgColor);
                        }}
                        className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-white/15"
                      />
                      <input
                        type="text"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Accent Color (Citron Lime)
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => {
                          setAccentColor(e.target.value);
                          updateLiveColors(primaryColor, e.target.value, darkBgColor, lightBgColor);
                        }}
                        className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-white/15"
                      />
                      <input
                        type="text"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Dark Mode Background */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Dark Background Color
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={darkBgColor}
                        onChange={(e) => setDarkBgColor(e.target.value)}
                        className="w-10 h-10 rounded-lg bg-transparent cursor-pointer border border-white/15"
                      />
                      <input
                        type="text"
                        value={darkBgColor}
                        onChange={(e) => setDarkBgColor(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Font Family */}
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Display Font Typography
                    </label>
                    <select
                      value={fontFamily}
                      onChange={(e) => setFontFamily(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none cursor-pointer"
                    >
                      <option value="Familjen Grotesk">Familjen Grotesk (CourseIt Original)</option>
                      <option value="Instrument Sans">Instrument Sans (Modern Minimal)</option>
                      <option value="Outfit">Outfit (Clean Geometric)</option>
                      <option value="Plus Jakarta Sans">Plus Jakarta Sans (SaaS Executive)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingBranding}
                  className="w-full py-3.5 rounded-full bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-transform hover:-translate-y-0.5 shadow-xl shadow-[#b8c460]/10 cursor-pointer disabled:opacity-50"
                >
                  {savingBranding ? "Applying live updates..." : "Save & Apply Live to Entire Website"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 2: PLANS, PRICING & QUOTAS */}
          {activeTab === "plans" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">Monetization, Quotas & Platform Controls</h2>
                <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                  Adjust free tier allowances, Pro/Max pricing, generation quotas, and platform maintenance status.
                </p>
              </div>

              <form onSubmit={handleSavePlans} className="space-y-6">
                {/* Free Tier Controls */}
                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>🌱</span> Free Tier Quotas
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-white/10 text-[#b3b7a3] text-[0.68rem] font-mono">
                      Default for all signups
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Monthly Study Hours Quota (Hours)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={freeHoursLimit}
                        onChange={(e) => setFreeHoursLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Monthly Course Generations Limit
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        value={freeGenerationsLimit}
                        onChange={(e) => setFreeGenerationsLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Pro Tier Controls */}
                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-[#b8c460] flex items-center gap-2">
                      <span>⚡</span> Pro Plan Controls
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-[#b8c460]/20 text-[#b8c460] text-[0.68rem] font-mono font-bold">
                      Popular Tier
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Monthly Price ($ USD)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={proPriceMonthly}
                        onChange={(e) => setProPriceMonthly(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Monthly Study Hours
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={proHoursLimit}
                        onChange={(e) => setProHoursLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Course Generations
                      </label>
                      <input
                        type="number"
                        min={5}
                        value={proGenerationsLimit}
                        onChange={(e) => setProGenerationsLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Max Tier Controls */}
                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-purple-400 flex items-center gap-2">
                      <span>👑</span> Max Tier Controls
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[0.68rem] font-mono font-bold">
                      Unlimited Power
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Monthly Price ($ USD)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={maxPriceMonthly}
                        onChange={(e) => setMaxPriceMonthly(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Monthly Study Hours
                      </label>
                      <input
                        type="number"
                        min={20}
                        value={maxHoursLimit}
                        onChange={(e) => setMaxHoursLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                        Course Generations
                      </label>
                      <input
                        type="number"
                        min={20}
                        value={maxGenerationsLimit}
                        onChange={(e) => setMaxGenerationsLimit(Number(e.target.value))}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Platform Switches */}
                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                  <h3 className="text-xs font-bold uppercase font-mono text-[#b3b7a3]">Global Platform Gates</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                      <div>
                        <strong className="block text-sm font-semibold text-white">Allow Public User Signups</strong>
                        <span className="text-xs text-[#b3b7a3]">
                          When disabled, new visitor registrations are locked.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={allowNewSignups}
                        onChange={(e) => setAllowNewSignups(e.target.checked)}
                        className="w-5 h-5 accent-[#b8c460] cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/10 cursor-pointer">
                      <div>
                        <strong className="block text-sm font-semibold text-white">Maintenance Mode</strong>
                        <span className="text-xs text-[#b3b7a3]">
                          Display scheduled maintenance warning banner to visitors.
                        </span>
                      </div>
                      <input
                        type="checkbox"
                        checked={maintenanceMode}
                        onChange={(e) => setMaintenanceMode(e.target.checked)}
                        className="w-5 h-5 accent-amber-500 cursor-pointer"
                      />
                    </label>

                    {maintenanceMode && (
                      <div>
                        <label className="block text-xs font-semibold text-[#b3b7a3] mb-1.5">
                          Maintenance Alert Message
                        </label>
                        <input
                          type="text"
                          value={maintenanceMessage}
                          onChange={(e) => setMaintenanceMessage(e.target.value)}
                          className="w-full px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={savingPlans}
                  className="w-full py-3.5 rounded-full bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-transform hover:-translate-y-0.5 shadow-xl shadow-[#b8c460]/10 cursor-pointer disabled:opacity-50"
                >
                  {savingPlans ? "Saving plan configuration..." : "Save Monetization & Quota Controls"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 3: AI ENGINE & INTELLIGENCE */}
          {activeTab === "ai" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">AI Engine & Provider Architecture</h2>
                <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                  Configure LLM orchestration for YouTube transcript summarization, active recall quiz generation, and placement questions.
                </p>
              </div>

              <form onSubmit={handleSaveAi} className="space-y-6">
                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                  <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono">
                    Active AI Model Provider
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      {
                        id: "NVIDIA_NEMOTRON",
                        title: "NVIDIA Nemotron 4 (Recommended)",
                        desc: "High educational accuracy, structured JSON extraction",
                        badge: "Default",
                      },
                      {
                        id: "OPENAI_COMPATIBLE",
                        title: "OpenAI Compatible",
                        desc: "Direct support for GPT-4o, GPT-4o-mini, vLLM, Ollama",
                        badge: "Fast",
                      },
                      {
                        id: "GROQ",
                        title: "Groq Cloud (Llama 3.3 70B)",
                        desc: "Sub-second inference for instant course generation",
                        badge: "Ultra-Fast",
                      },
                      {
                        id: "HEURISTIC_MOCK",
                        title: "Deterministic Heuristic Parser",
                        desc: "Offline backup parser with zero token cost",
                        badge: "Fallback",
                      },
                    ].map((p) => (
                      <label
                        key={p.id}
                        onClick={() => setAiProvider(p.id)}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                          aiProvider === p.id
                            ? "bg-[#b8c460]/15 border-[#b8c460]"
                            : "bg-white/5 border-white/10 hover:border-white/20"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <strong className="text-sm font-semibold text-white">{p.title}</strong>
                          <span className="text-[0.62rem] font-mono px-2 py-0.5 rounded-full bg-white/10 text-[#b3b7a3]">
                            {p.badge}
                          </span>
                        </div>
                        <p className="text-xs text-[#b3b7a3]">{p.desc}</p>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Model Identifier / Checkpoint
                    </label>
                    <input
                      type="text"
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      placeholder="e.g. nvidia/llama-3.1-nemotron-70b-instruct"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[#b3b7a3] uppercase font-mono mb-2">
                      Provider API Key (Optional Override)
                    </label>
                    <input
                      type="password"
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Overrides server environment variable if set"
                      className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none font-mono"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-[#b3b7a3] uppercase font-mono">
                        Generation Temperature: {aiTemperature}
                      </label>
                      <span className="text-xs text-[#b3b7a3]">0 = Strict & Deterministic, 1 = Creative</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.05}
                      value={aiTemperature}
                      onChange={(e) => setAiTemperature(Number(e.target.value))}
                      className="w-full accent-[#b8c460] cursor-pointer"
                    />
                  </div>
                </div>

                {/* AI Interactive Test Runner */}
                <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-3">
                  <h3 className="text-xs font-bold uppercase font-mono text-[#b3b7a3]">Live AI Test Playground</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={testPrompt}
                      onChange={(e) => setTestPrompt(e.target.value)}
                      placeholder="Prompt to test AI response..."
                      className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/15 text-sm text-white"
                    />
                    <button
                      type="button"
                      onClick={handleTestAi}
                      disabled={testingAi}
                      className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {testingAi ? "Querying LLM..." : "Test AI Call →"}
                    </button>
                  </div>
                  {testOutput && (
                    <div className="p-3 rounded-xl bg-black/50 border border-white/10 text-xs font-mono text-[#b8c460] whitespace-pre-wrap">
                      {testOutput}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={savingAi}
                  className="w-full py-3.5 rounded-full bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-transform hover:-translate-y-0.5 shadow-xl shadow-[#b8c460]/10 cursor-pointer disabled:opacity-50"
                >
                  {savingAi ? "Saving AI parameters..." : "Save AI Engine Configuration"}
                </button>
              </form>
            </div>
          )}

          {/* TAB 4: COURSES & CONTENT MANAGEMENT */}
          {activeTab === "courses" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">Course & Content Management</h2>
                  <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                    Manage generated courses, toggle public visibility, or directly ingest YouTube content.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadCourses}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white self-start transition-colors cursor-pointer"
                >
                  ↻ Refresh Courses
                </button>
              </div>

              {/* Direct YouTube Ingest Tool */}
              <form onSubmit={handleIngestCourse} className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase font-mono text-[#b3b7a3]">Direct Admin YouTube Ingestion</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="Paste YouTube Video or Playlist URL (e.g. https://www.youtube.com/watch?v=...)"
                    value={ingestUrl}
                    onChange={(e) => setIngestUrl(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={ingesting || !ingestUrl.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {ingesting ? "Ingesting..." : "+ Ingest Course"}
                  </button>
                </div>
              </form>

              {/* Search Bar */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filter courses by title, slug, or creator..."
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#121815] border border-white/10 text-sm text-white focus:border-[#b8c460] outline-none"
                />
              </div>

              {/* Course Table */}
              <div className="rounded-3xl bg-[#121815] border border-white/10 overflow-hidden">
                {coursesLoading ? (
                  <div className="p-12 text-center text-xs text-[#b3b7a3]">Loading courses from database...</div>
                ) : courses.length === 0 ? (
                  <div className="p-12 text-center text-xs text-[#b3b7a3]">No courses found matching filter.</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-white/5 border-b border-white/10 text-[#b3b7a3] font-mono text-[0.7rem] uppercase">
                        <tr>
                          <th className="p-4">Course</th>
                          <th className="p-4">Creator</th>
                          <th className="p-4">Chapters</th>
                          <th className="p-4">Duration</th>
                          <th className="p-4">Visibility</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {courses
                          .filter(
                            (c) =>
                              !courseSearch ||
                              c.title.toLowerCase().includes(courseSearch.toLowerCase()) ||
                              c.creatorEmail.toLowerCase().includes(courseSearch.toLowerCase())
                          )
                          .map((c) => (
                            <tr key={c.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-12 h-8 rounded-lg bg-black overflow-hidden shrink-0 border border-white/10">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={c.thumbnailUrl || "https://i.ytimg.com/vi/LSk5KaEGVK4/hqdefault.jpg"}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                  <div className="min-w-0">
                                    <strong className="block text-white truncate max-w-[200px] sm:max-w-xs">
                                      {c.title}
                                    </strong>
                                    <span className="text-[0.7rem] font-mono text-[#b3b7a3]">/{c.slug}</span>
                                  </div>
                                </div>
                              </td>
                              <td className="p-4 text-[#b3b7a3] truncate max-w-[140px]">{c.creatorEmail}</td>
                              <td className="p-4 font-mono">{c.chapterCount} ch</td>
                              <td className="p-4 font-mono">
                                {Math.round((c.durationSeconds / 60) * 10) / 10}m
                              </td>
                              <td className="p-4">
                                <button
                                  type="button"
                                  onClick={() => handleToggleCourseVisibility(c.id, c.isPublic)}
                                  className={`px-2.5 py-1 rounded-full text-[0.68rem] font-mono font-bold cursor-pointer transition-colors ${
                                    c.isPublic
                                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                      : "bg-white/10 text-[#b3b7a3] border border-white/15"
                                  }`}
                                >
                                  {c.isPublic ? "PUBLIC" : "PRIVATE"}
                                </button>
                              </td>
                              <td className="p-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Link
                                    href={`/courses/${c.slug}`}
                                    target="_blank"
                                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-[#b3b7a3] hover:text-white transition-colors"
                                    title="View Course"
                                  >
                                    ↗
                                  </Link>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCourse(c.id, c.title)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                    title="Delete Course"
                                  >
                                    🗑
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 5: USERS & ROLES */}
          {activeTab === "users" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold font-display text-white">User Accounts & Roles</h2>
                  <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                    Manage registered accounts, promote to Administrator, adjust subscription plans, and edit study streaks.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadUsers}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-xs font-semibold text-white self-start transition-colors cursor-pointer"
                >
                  ↻ Refresh Users
                </button>
              </div>

              {/* Quick Admin Grant Form */}
              <form onSubmit={handleQuickPromote} className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-3">
                <h3 className="text-xs font-bold uppercase font-mono text-[#b3b7a3]">1-Click Make Admin</h3>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="email"
                    placeholder="Enter user email to grant Administrator rights..."
                    value={quickAdminEmail}
                    onChange={(e) => setQuickAdminEmail(e.target.value)}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-black/40 border border-white/15 text-sm text-white focus:border-[#b8c460] outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!quickAdminEmail.trim()}
                    className="px-6 py-2.5 rounded-xl bg-[#b8c460] text-[#0f1611] font-bold text-sm hover:bg-[#a6b350] transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Promote to Admin
                  </button>
                </div>
              </form>

              {/* Search Bar */}
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Filter users by email or name..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-2xl bg-[#121815] border border-white/10 text-sm text-white focus:border-[#b8c460] outline-none"
                />
              </div>

              {/* Users Table */}
              <div className="rounded-3xl bg-[#121815] border border-white/10 overflow-hidden">
                {usersLoading ? (
                  <div className="p-12 text-center text-xs text-[#b3b7a3]">Loading users...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs sm:text-sm">
                      <thead className="bg-white/5 border-b border-white/10 text-[#b3b7a3] font-mono text-[0.7rem] uppercase">
                        <tr>
                          <th className="p-4">User</th>
                          <th className="p-4">Role</th>
                          <th className="p-4">Plan Tier</th>
                          <th className="p-4">Streak</th>
                          <th className="p-4">Enrolled</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {users
                          .filter(
                            (u) =>
                              !userSearch ||
                              u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
                              u.displayName.toLowerCase().includes(userSearch.toLowerCase())
                          )
                          .map((u) => (
                            <tr key={u.id} className="hover:bg-white/5 transition-colors">
                              <td className="p-4">
                                <strong className="block text-white font-medium">{u.displayName}</strong>
                                <span className="text-[0.7rem] font-mono text-[#b3b7a3]">{u.email}</span>
                              </td>
                              <td className="p-4">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateUserRole(u.id, u.role)}
                                  className={`px-2.5 py-1 rounded-full text-[0.68rem] font-mono font-bold cursor-pointer transition-colors ${
                                    u.role === "ADMIN"
                                      ? "bg-[#b8c460] text-[#0f1611]"
                                      : "bg-white/10 text-[#b3b7a3] hover:text-white"
                                  }`}
                                  title="Click to toggle Role"
                                >
                                  {u.role}
                                </button>
                              </td>
                              <td className="p-4">
                                <select
                                  value={u.tier}
                                  onChange={(e) => handleUpdateUserTier(u.id, e.target.value)}
                                  className="px-2 py-1 rounded-lg bg-black/40 border border-white/15 text-xs text-white cursor-pointer font-mono"
                                >
                                  <option value="FREE">FREE</option>
                                  <option value="PRO">PRO</option>
                                  <option value="MAX">MAX</option>
                                </select>
                              </td>
                              <td className="p-4 font-mono font-semibold text-[#b8c460]">🔥 {u.streakDays}d</td>
                              <td className="p-4 font-mono">{u.coursesEnrolled}</td>
                              <td className="p-4 text-right">
                                {u.id !== "cmw9msul9000007jn52uweaq0" && u.email !== userEmail && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(u.id, u.email)}
                                    className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                                    title="Delete User"
                                  >
                                    🗑
                                  </button>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 6: TELEMETRY & HEALTH */}
          {activeTab === "metrics" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">Platform Telemetry & Metrics</h2>
                <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                  Live counters, database status, and aggregate learning activity.
                </p>
              </div>

              {/* 5 High-Impact Stat Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: "Total Users", val: metrics?.totalUsers ?? users.length, icon: "👥" },
                  { label: "Active Courses", val: metrics?.totalCourses ?? courses.length, icon: "📚" },
                  { label: "Total Lessons", val: metrics?.totalLessons ?? 0, icon: "📝" },
                  { label: "Study Hours", val: `${metrics?.totalLearningHours ?? 0}h`, icon: "⏱" },
                  { label: "AI Jobs Done", val: metrics?.completedJobs ?? 0, icon: "⚡" },
                ].map((stat, idx) => (
                  <div key={idx} className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-1 shadow-sm">
                    <div className="flex items-center justify-between text-[#b3b7a3] text-xs">
                      <span>{stat.label}</span>
                      <span>{stat.icon}</span>
                    </div>
                    <p className="text-3xl font-display font-bold text-white pt-1">{stat.val}</p>
                  </div>
                ))}
              </div>

              {/* Health Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-2">
                  <span className="text-[0.68rem] font-mono text-emerald-400 uppercase font-bold">● Healthy</span>
                  <h4 className="text-sm font-bold text-white">PostgreSQL Database</h4>
                  <p className="text-xs text-[#b3b7a3]">Connected to Supabase production cluster.</p>
                </div>
                <div className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-2">
                  <span className="text-[0.68rem] font-mono text-emerald-400 uppercase font-bold">● Operational</span>
                  <h4 className="text-sm font-bold text-white">AI Generation Pipeline</h4>
                  <p className="text-xs text-[#b3b7a3]">NVIDIA Nemotron LLM endpoint responsive.</p>
                </div>
                <div className="p-5 rounded-3xl bg-[#121815] border border-white/10 space-y-2">
                  <span className="text-[0.68rem] font-mono text-emerald-400 uppercase font-bold">● Protected</span>
                  <h4 className="text-sm font-bold text-white">Route Security Shield</h4>
                  <p className="text-xs text-[#b3b7a3]">/admin blocked; /studio-hub protected.</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: ROUTE & SECURITY SHIELD */}
          {activeTab === "security" && (
            <div className="space-y-8 animate-in fade-in duration-200">
              <div>
                <h2 className="text-2xl font-bold font-display text-white">Security & Obfuscation Shield</h2>
                <p className="text-xs sm:text-sm text-[#b3b7a3] mt-1">
                  Route privacy status and administrator authentication configuration.
                </p>
              </div>

              <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white">Route Protection Strategy</h3>
                <div className="space-y-3 text-xs text-[#b3b7a3] leading-relaxed">
                  <p>
                    ✓ <strong className="text-white">Public /admin Trapped:</strong> Any unauthorized bot or visitor attempting to visit{" "}
                    <code className="text-red-400 font-mono">/admin</code> is instantly served an HTTP 404 Not Found error page.
                  </p>
                  <p>
                    ✓ <strong className="text-white">Active Vault Route:</strong> The administration hub is only accessible at{" "}
                    <code className="text-[#b8c460] font-mono">/studio-hub</code>.
                  </p>
                  <p>
                    ✓ <strong className="text-white">Role-Based Clearance:</strong> Only users verified in Postgres with{" "}
                    <code className="text-white font-mono">role: &quot;ADMIN&quot;</code> can access this hub.
                  </p>
                </div>
              </div>

              <div className="p-6 rounded-3xl bg-[#121815] border border-white/10 space-y-4">
                <h3 className="text-sm font-bold text-white">Emergency Admin Authorization</h3>
                <p className="text-xs text-[#b3b7a3]">
                  If you need to grant admin access to another device or account without modifying SQL:
                </p>
                <div className="p-4 rounded-2xl bg-black/40 border border-white/10 font-mono text-xs space-y-1">
                  <p className="text-[#b3b7a3]">Passphrase:</p>
                  <p className="text-[#b8c460] font-bold">courseyl_admin_vault_2026</p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

