"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { LandscapeIllustration } from "@/components/LandscapeHero";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

type AuthProvidersMap = {
  google: { enabled: boolean; mode: string };
  github: { enabled: boolean; mode: string };
  x: { enabled: boolean; mode: string };
  email: { enabled: boolean; mode: string; requireVerification: boolean };
};

export function CourseItFloatingSquares() {
  return (
    <>
      {/* Bottom-left staggered glass squares matching Light & Dark screenshots */}
      <div
        className="hidden sm:block absolute left-8 md:left-16 lg:left-28 bottom-[24%] w-11 h-11 rounded-xl border border-white/60 dark:border-white/25 bg-white/15 dark:bg-white/[0.06] backdrop-blur-md shadow-[0_8px_32px_rgba(22,49,92,0.12)] dark:shadow-2xl pointer-events-none select-none z-10 animate-[float_7s_ease-in-out_infinite]"
        aria-hidden="true"
      />
      <div
        className="hidden sm:block absolute left-14 md:left-24 lg:left-40 bottom-[16%] w-10 h-10 rounded-xl border border-white/55 dark:border-white/20 bg-white/15 dark:bg-white/[0.05] backdrop-blur-md shadow-[0_8px_32px_rgba(22,49,92,0.12)] dark:shadow-2xl pointer-events-none select-none z-10 animate-[float_7s_ease-in-out_infinite_-2.5s]"
        aria-hidden="true"
      />
      {/* Bottom-right floating glass square */}
      <div
        className="hidden sm:block absolute right-10 md:right-20 lg:right-32 bottom-[25%] w-11 h-11 rounded-xl border border-white/60 dark:border-white/25 bg-white/15 dark:bg-white/[0.06] backdrop-blur-md shadow-[0_8px_32px_rgba(22,49,92,0.12)] dark:shadow-2xl pointer-events-none select-none z-10 animate-[float_7s_ease-in-out_infinite_-1.5s]"
        aria-hidden="true"
      />
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { settings } = useSiteSettings();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [providers, setProviders] = useState<AuthProvidersMap | null>(null);

  // Email flow state: "choose" (OAuth + Email initiation) vs "verify" (6-digit OTP verification)
  const [step, setStep] = useState<"choose" | "verify">("choose");
  const [emailSectionOpen, setEmailSectionOpen] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<
    "otp" | "password-login" | "password-signup"
  >("otp");

  const [fullName, setFullName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const err = params.get("error");
      if (err) {
        setError(err);
      }
      const modeParam = params.get("mode");
      if (modeParam === "email" || modeParam === "signup") {
        setEmailSectionOpen(true);
        if (modeParam === "signup") setEmailAuthMode("password-signup");
      }
    }

    fetch("/api/auth/providers", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d?.providers) setProviders(d.providers);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendCooldown]);

  const getNextUrl = () => {
    if (typeof window !== "undefined") {
      return (
        new URLSearchParams(window.location.search).get("next") || "/dashboard"
      );
    }
    return "/dashboard";
  };

  // 1. GOOGLE OAUTH
  const handleGoogleOAuth = () => {
    setLoading(true);
    setError("");
    setSuccessMsg("Redirecting to Google account selector...");
    window.location.href = `/api/auth/google?next=${encodeURIComponent(
      getNextUrl()
    )}`;
  };

  // 2. GITHUB OAUTH
  const handleGitHubOAuth = () => {
    setError("");
    setSuccessMsg("");
    if (providers && providers.github && !providers.github.enabled) {
      setError(
        "GitHub OAuth is not configured on this server yet. Add GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET in Admin Studio → Security (or enable GitHub inside Supabase Auth Providers), or sign in with Google / verified Email below."
      );
      return;
    }
    setLoading(true);
    setSuccessMsg("Connecting to GitHub...");
    window.location.href = `/api/auth/github?next=${encodeURIComponent(
      getNextUrl()
    )}`;
  };

  // 3. X (TWITTER) OAUTH
  const handleXOAuth = () => {
    setError("");
    setSuccessMsg("");
    if (providers && providers.x && !providers.x.enabled) {
      setError(
        "X (Twitter) OAuth is not configured on this server yet. Add X_CLIENT_ID & X_CLIENT_SECRET in Admin Studio → Security (or enable Twitter/X inside Supabase Auth Providers), or sign in with Google / verified Email below."
      );
      return;
    }
    setLoading(true);
    setSuccessMsg("Connecting to X...");
    window.location.href = `/api/auth/x?next=${encodeURIComponent(
      getNextUrl()
    )}`;
  };

  // 4. SEND REAL EMAIL VERIFICATION CODE + MAGIC LINK
  const handleSendEmailOtp = async (e?: React.FormEvent, overrideEmail?: string) => {
    if (e) e.preventDefault();
    const targetEmail = (overrideEmail ?? emailInput).trim().toLowerCase();
    if (!targetEmail) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          next: getNextUrl(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Could not send confirmation email. Please verify your address."
        );
      }

      setPendingEmail(data.email || targetEmail);
      setStep("verify");
      setResendCooldown(60);
      setOtpCode("");
      setSuccessMsg(
        data.message ||
          `Confirmation link & 6-digit verification code sent to ${targetEmail}.`
      );
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to dispatch verification email."
      );
    } finally {
      setLoading(false);
    }
  };

  // 5. VERIFY 6-DIGIT EMAIL CODE
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = otpCode.trim().replace(/\s+/g, "");
    if (!cleanCode) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pendingEmail,
          code: cleanCode,
          next: getNextUrl(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Invalid or expired verification code.");
      }

      setSuccessMsg("Email verified! Opening your dashboard...");
      window.dispatchEvent(new Event("user-updated"));
      router.push(data.redirectTo || getNextUrl());
      router.refresh();
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Code verification failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // 6. PASSWORD LOGIN / REGISTER (WITH MANDATORY EMAIL CONFIRMATION)
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail || !password) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      if (emailAuthMode === "password-signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: fullName.trim(),
            email: cleanEmail,
            password,
            next: getNextUrl(),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Could not create account.");
        }

        setPendingEmail(data.email || cleanEmail);
        setStep("verify");
        setResendCooldown(60);
        setOtpCode("");
        setSuccessMsg(
          data.message ||
            `Account created! Enter the confirmation code sent to ${cleanEmail}.`
        );
      } else {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
            password,
            next: getNextUrl(),
          }),
        });
        const data = await res.json();

        if (res.status === 403 && data?.requiresVerification) {
          setPendingEmail(data.email || cleanEmail);
          setStep("verify");
          setResendCooldown(60);
          setSuccessMsg(
            data.error ||
              `Confirmation code sent to ${cleanEmail}. Please verify your email first.`
          );
          return;
        }

        if (!res.ok) {
          throw new Error(data.error || "Invalid email or password.");
        }

        setSuccessMsg("Signed in! Opening your dashboard...");
        window.dispatchEvent(new Event("user-updated"));
        router.push(getNextUrl());
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const allowSignups = settings?.plans?.allowNewSignups !== false;

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#fcfcfa] dark:bg-[#0e1311] text-[#0f1611] dark:text-[#f1f3ea] overflow-hidden transition-colors duration-300">
      {/* 1. FLOATING NAVBAR WITH LIGHT / DARK TOGGLE */}
      <MarketingNavbar />

      {/* 2. FULL-SCREEN RESPONSIVE SUNRISE (LIGHT) / STARRY NIGHT (DARK) LANDSCAPE */}
      <LandscapeIllustration className="fixed inset-0 w-full h-full object-cover" />

      {/* 3. FLOATING FROSTED GLASS SQUARES MATCHING SCREENSHOTS */}
      <CourseItFloatingSquares />

      {/* 4. CENTER GLASSMORPHISM AUTH CARD MATCHING LIGHT & DARK REFERENCE SCREENSHOTS */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 pt-24 pb-10 w-full">
        <div className="relative w-full max-w-[440px] rounded-[30px] border border-white/75 dark:border-white/12 bg-white/58 dark:bg-[#141f27]/72 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_24px_60px_-15px_rgba(22,49,92,0.18),inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-[0_28px_72px_-12px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.08)] text-center flex flex-col items-center transition-all duration-300">
          {/* Subtle glass specular sheen matching screenshot */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[30px] bg-gradient-to-br from-white/45 via-transparent to-indigo-100/35 dark:from-white/[0.06] dark:via-transparent dark:to-[#16315c]/20"
          />

          <div className="relative z-10 w-full flex flex-col items-center">
            {step === "choose" ? (
              <>
                {/* Heading */}
                <h1 className="text-[1.75rem] sm:text-[2.05rem] font-display font-medium tracking-tight text-[#0f1611] dark:text-[#f5f7f2] leading-tight">
                  Pick up where you{" "}
                  <em className="italic font-serif font-normal text-[#4b5e1e] dark:text-[#b8c460]">
                    left off.
                  </em>
                </h1>

                {/* Subtitle */}
                <p className="text-[0.82rem] sm:text-[0.85rem] text-[#4c4c3d] dark:text-white/65 mt-2 mb-6">
                  Your streak, your plan and your notes are waiting.
                </p>

                {/* Alert Messages */}
                {error && (
                  <div className="w-full p-3 mb-4 rounded-2xl bg-red-500/12 dark:bg-red-500/15 border border-red-600/25 dark:border-red-400/30 text-xs text-red-900 dark:text-red-200 text-left leading-relaxed backdrop-blur-sm">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="w-full p-3 mb-4 rounded-2xl bg-[#eef2da]/90 dark:bg-[#b8c460]/15 border border-[#4b5e1e]/25 dark:border-[#b8c460]/30 text-xs text-[#3c4c16] dark:text-[#d5df88] font-medium text-center backdrop-blur-sm">
                    {successMsg}
                  </div>
                )}

                {/* 3 OAuth Pill Buttons matching Screenshots 1 & 2 */}
                <div className="w-full space-y-2.5">
                  {/* Google OAuth */}
                  <button
                    type="button"
                    onClick={handleGoogleOAuth}
                    disabled={loading}
                    className="w-full h-12 px-5 rounded-full border border-[#0f1611]/12 dark:border-white/15 bg-white/45 hover:bg-white/75 dark:bg-white/[0.04] dark:hover:bg-white/[0.10] hover:border-[#0f1611]/25 dark:hover:border-white/30 text-[#0f1611] dark:text-white text-[0.84rem] sm:text-[0.88rem] font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer backdrop-blur-md active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>Continue with Google</span>
                  </button>

                  {/* GitHub OAuth */}
                  <button
                    type="button"
                    onClick={handleGitHubOAuth}
                    disabled={loading}
                    className="w-full h-12 px-5 rounded-full border border-[#0f1611]/12 dark:border-white/15 bg-white/45 hover:bg-white/75 dark:bg-white/[0.04] dark:hover:bg-white/[0.10] hover:border-[#0f1611]/25 dark:hover:border-white/30 text-[#0f1611] dark:text-white text-[0.84rem] sm:text-[0.88rem] font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer backdrop-blur-md active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg
                      className="w-4 h-4 fill-current shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                      />
                    </svg>
                    <span>Continue with GitHub</span>
                  </button>

                  {/* X (Twitter) OAuth */}
                  <button
                    type="button"
                    onClick={handleXOAuth}
                    disabled={loading}
                    className="w-full h-12 px-5 rounded-full border border-[#0f1611]/12 dark:border-white/15 bg-white/45 hover:bg-white/75 dark:bg-white/[0.04] dark:hover:bg-white/[0.10] hover:border-[#0f1611]/25 dark:hover:border-white/30 text-[#0f1611] dark:text-white text-[0.84rem] sm:text-[0.88rem] font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer backdrop-blur-md active:scale-[0.99] disabled:opacity-50"
                  >
                    <svg
                      className="w-3.5 h-3.5 fill-current shrink-0"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                    <span>Continue with X</span>
                  </button>
                </div>

                {/* Expandable Authentic Email Section (keeps visual card sleek like screenshots) */}
                <div className="w-full mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEmailSectionOpen(!emailSectionOpen);
                      setError("");
                    }}
                    className="w-full flex items-center gap-3 group cursor-pointer py-1"
                  >
                    <div className="flex-1 h-px bg-[#0f1611]/10 dark:bg-white/12 group-hover:bg-[#0f1611]/20 dark:group-hover:bg-white/25 transition-colors" />
                    <span className="text-[0.7rem] font-mono uppercase tracking-wider text-[#4c4c3d] dark:text-white/55 group-hover:text-[#0f1611] dark:group-hover:text-white transition-colors">
                      {emailSectionOpen ? "hide email options ↑" : "or continue with email ↓"}
                    </span>
                    <div className="flex-1 h-px bg-[#0f1611]/10 dark:bg-white/12 group-hover:bg-[#0f1611]/20 dark:group-hover:bg-white/25 transition-colors" />
                  </button>

                  {emailSectionOpen && (
                    <div className="mt-3 space-y-3 animate-in fade-in duration-200">
                      {/* Email Method Selector Pills */}
                      <div className="inline-flex p-1 rounded-full bg-white/40 dark:bg-white/[0.05] border border-[#0f1611]/10 dark:border-white/10 text-[0.72rem] font-medium">
                        <button
                          type="button"
                          onClick={() => {
                            setEmailAuthMode("otp");
                            setError("");
                          }}
                          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                            emailAuthMode === "otp"
                              ? "bg-[#4b5e1e] text-[#f6f8ec] dark:bg-[#b8c460] dark:text-[#0f1611] shadow-xs"
                              : "text-[#4c4c3d] dark:text-white/65 hover:text-[#0f1611] dark:hover:text-white"
                          }`}
                        >
                          Email Code
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEmailAuthMode("password-login");
                            setError("");
                          }}
                          className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                            emailAuthMode === "password-login"
                              ? "bg-[#4b5e1e] text-[#f6f8ec] dark:bg-[#b8c460] dark:text-[#0f1611] shadow-xs"
                              : "text-[#4c4c3d] dark:text-white/65 hover:text-[#0f1611] dark:hover:text-white"
                          }`}
                        >
                          Password
                        </button>
                        {allowSignups && (
                          <button
                            type="button"
                            onClick={() => {
                              setEmailAuthMode("password-signup");
                              setError("");
                            }}
                            className={`px-3 py-1 rounded-full transition-all cursor-pointer ${
                              emailAuthMode === "password-signup"
                                ? "bg-[#4b5e1e] text-[#f6f8ec] dark:bg-[#b8c460] dark:text-[#0f1611] shadow-xs"
                                : "text-[#4c4c3d] dark:text-white/65 hover:text-[#0f1611] dark:hover:text-white"
                            }`}
                          >
                            Create account
                          </button>
                        )}
                      </div>

                      {emailAuthMode === "otp" ? (
                        <form onSubmit={(e) => handleSendEmailOtp(e)} className="space-y-2">
                          <div className="relative flex items-center">
                            <input
                              type="email"
                              required
                              value={emailInput}
                              onChange={(e) => setEmailInput(e.target.value)}
                              placeholder="you@domain.com"
                              className="w-full h-11 pl-4 pr-28 rounded-full border border-[#0f1611]/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.06] text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/60 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460] transition-all"
                            />
                            <button
                              type="submit"
                              disabled={loading || !emailInput.trim()}
                              className="absolute right-1.5 h-8 px-3.5 rounded-full bg-[#4b5e1e] hover:bg-[#3c4c16] text-[#f6f8ec] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] dark:text-[#0f1611] font-semibold text-xs transition-colors disabled:opacity-40 cursor-pointer flex items-center gap-1"
                            >
                              {loading ? "..." : "Send code →"}
                            </button>
                          </div>
                          <p className="text-[0.68rem] text-[#4c4c3d]/80 dark:text-white/50">
                            We&apos;ll send a real confirmation email &amp; 6-digit code to verify your inbox.
                          </p>
                        </form>
                      ) : (
                        <form onSubmit={handlePasswordSubmit} className="space-y-2 text-left">
                          {emailAuthMode === "password-signup" && (
                            <input
                              type="text"
                              required
                              value={fullName}
                              onChange={(e) => setFullName(e.target.value)}
                              placeholder="Full name"
                              className="w-full h-11 px-4 rounded-full border border-[#0f1611]/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.06] text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/60 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460]"
                            />
                          )}
                          <input
                            type="email"
                            required
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            placeholder="Email address"
                            className="w-full h-11 px-4 rounded-full border border-[#0f1611]/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.06] text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/60 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460]"
                          />
                          <input
                            type="password"
                            required
                            minLength={emailAuthMode === "password-signup" ? 8 : 1}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={
                              emailAuthMode === "password-signup"
                                ? "Password (min 8 characters)"
                                : "Password"
                            }
                            className="w-full h-11 px-4 rounded-full border border-[#0f1611]/15 dark:border-white/15 bg-white/60 dark:bg-white/[0.06] text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/60 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460]"
                          />
                          <button
                            type="submit"
                            disabled={loading}
                            className="w-full h-11 rounded-full bg-[#4b5e1e] hover:bg-[#3c4c16] text-[#f6f8ec] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] dark:text-[#0f1611] font-semibold text-xs sm:text-sm transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {loading
                              ? "Please wait..."
                              : emailAuthMode === "password-signup"
                              ? "Create Account & Verify Email →"
                              : "Sign In →"}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>

                {/* Legal Disclaimer matching Screenshot */}
                <p className="text-[0.72rem] text-[#4c4c3d] dark:text-white/55 text-center mt-6 leading-relaxed">
                  By continuing you agree to our{" "}
                  <Link
                    href="/terms"
                    className="underline underline-offset-2 hover:text-[#0f1611] dark:hover:text-white transition-colors"
                  >
                    Terms and Conditions
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy"
                    className="underline underline-offset-2 hover:text-[#0f1611] dark:hover:text-white transition-colors"
                  >
                    Privacy policy
                  </Link>
                  .
                </p>
              </>
            ) : (
              /* ================= STEP 2: EMAIL VERIFICATION CODE SCREEN ================= */
              <div className="w-full space-y-4">
                <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#e4e9c6] dark:bg-[#283117] text-[#3c4c16] dark:text-[#d5df88] text-[0.7rem] font-mono font-bold uppercase tracking-wider">
                  Check Your Inbox
                </div>

                <h2 className="text-2xl font-display font-medium text-[#0f1611] dark:text-[#f5f7f2] tracking-tight">
                  Verify your{" "}
                  <em className="italic font-serif text-[#4b5e1e] dark:text-[#b8c460]">
                    email.
                  </em>
                </h2>

                <p className="text-xs sm:text-[0.82rem] text-[#4c4c3d] dark:text-white/70 leading-relaxed">
                  Click the confirmation link sent to{" "}
                  <strong className="text-[#0f1611] dark:text-white font-semibold">
                    {pendingEmail}
                  </strong>{" "}
                  or enter the 6-digit code below.
                </p>

                {error && (
                  <div className="w-full p-3 rounded-2xl bg-red-500/12 dark:bg-red-500/15 border border-red-600/25 dark:border-red-400/30 text-xs text-red-900 dark:text-red-200 text-left">
                    {error}
                  </div>
                )}

                {successMsg && (
                  <div className="w-full p-3 rounded-2xl bg-[#eef2da]/90 dark:bg-[#b8c460]/15 border border-[#4b5e1e]/25 dark:border-[#b8c460]/30 text-xs text-[#3c4c16] dark:text-[#d5df88] font-medium">
                    {successMsg}
                  </div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-3 pt-1">
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={8}
                    required
                    value={otpCode}
                    onChange={(e) =>
                      setOtpCode(e.target.value.replace(/[^\d]/g, ""))
                    }
                    placeholder="000000"
                    className="w-full h-13 px-5 rounded-full border border-[#0f1611]/15 dark:border-white/20 bg-white/70 dark:bg-white/[0.06] text-center font-mono text-xl tracking-[0.4em] text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/35 dark:placeholder-white/25 outline-none focus:border-[#4b5e1e] dark:focus:border-[#b8c460]"
                  />

                  <button
                    type="submit"
                    disabled={loading || otpCode.length < 6}
                    className="w-full h-12 rounded-full bg-[#4b5e1e] hover:bg-[#3c4c16] text-[#f6f8ec] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] dark:text-[#0f1611] font-semibold text-sm transition-colors cursor-pointer disabled:opacity-45"
                  >
                    {loading ? "Verifying..." : "Verify & Sign In →"}
                  </button>
                </form>

                <div className="flex items-center justify-between pt-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setStep("choose");
                      setError("");
                      setSuccessMsg("");
                    }}
                    className="text-[#4c4c3d] dark:text-white/60 hover:text-[#0f1611] dark:hover:text-white transition-colors cursor-pointer"
                  >
                    ← Use a different account
                  </button>

                  <button
                    type="button"
                    disabled={loading || resendCooldown > 0}
                    onClick={() => handleSendEmailOtp(undefined, pendingEmail)}
                    className="font-semibold text-[#4b5e1e] dark:text-[#b8c460] hover:underline disabled:opacity-45 cursor-pointer"
                  >
                    {resendCooldown > 0
                      ? `Resend in ${resendCooldown}s`
                      : "Resend code"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
