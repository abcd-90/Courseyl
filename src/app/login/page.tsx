"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { LandscapeIllustration } from "@/components/LandscapeHero";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

type AuthProvidersMap = {
  google: { enabled: boolean; mode: string };
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

  // Email flow state: "choose" (Google / Email mode) vs "verify" (Email confirmation screen)
  const [step, setStep] = useState<"choose" | "verify">("choose");
  const [emailSectionOpen, setEmailSectionOpen] = useState(false);
  const [emailAuthMode, setEmailAuthMode] = useState<
    "password-login" | "password-signup"
  >("password-login");
  const [verifyPurpose, setVerifyPurpose] = useState<"VERIFY_EMAIL" | "LOGIN_OTP">(
    "VERIFY_EMAIL"
  );

  const [fullName, setFullName] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [password, setPassword] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verifySynced, setVerifySynced] = useState(false);
  const pollInFlightRef = useRef(false);

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
        setEmailAuthMode(
          modeParam === "signup" ? "password-signup" : "password-login"
        );
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

  useEffect(() => {
    if (step !== "verify" || verifySynced) return;
    let cancelled = false;

    const checkVerificationStatus = async () => {
      if (cancelled || pollInFlightRef.current) return;
      pollInFlightRef.current = true;
      try {
        const res = await fetch("/api/auth/email/status", {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok) return;
        const data = await res.json();
        if (data?.verified && !cancelled) {
          setVerifySynced(true);
          setError("");
          setSuccessMsg("");
          window.dispatchEvent(new Event("user-updated"));
          const destination = data.redirectTo || getNextUrl();
          setTimeout(() => {
            if (!cancelled) {
              router.push(destination);
              router.refresh();
            }
          }, 550);
        }
      } catch {
        // Transient network hiccup; next interval retries cleanly
      } finally {
        pollInFlightRef.current = false;
      }
    };

    checkVerificationStatus();
    const intervalId = setInterval(checkVerificationStatus, 2500);
    const onFocusOrVisible = () => {
      if (document.visibilityState === "visible") {
        checkVerificationStatus();
      }
    };
    window.addEventListener("focus", onFocusOrVisible);
    document.addEventListener("visibilitychange", onFocusOrVisible);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      window.removeEventListener("focus", onFocusOrVisible);
      document.removeEventListener("visibilitychange", onFocusOrVisible);
    };
  }, [step, verifySynced, router]);

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

  // 2. SEND REAL EMAIL VERIFICATION LINK
  const handleSendEmailOtp = async (
    e?: React.FormEvent,
    overrideEmail?: string,
    overridePurpose?: "VERIFY_EMAIL" | "LOGIN_OTP"
  ) => {
    if (e) e.preventDefault();
    const targetEmail = (overrideEmail ?? emailInput).trim().toLowerCase();
    if (!targetEmail) return;
    const purpose = overridePurpose ?? "LOGIN_OTP";

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          purpose,
          next: getNextUrl(),
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Could not send confirmation email. Please verify your address."
        );
      }

      const isResend = Boolean(overrideEmail);
      setPendingEmail(data.email || targetEmail);
      setVerifyPurpose(purpose);
      setVerifySynced(false);
      setStep("verify");
      setResendCooldown(60);
      setSuccessMsg(isResend ? "Confirmation email resent." : "");
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

  // 5. PASSWORD LOGIN / REGISTER (WITH MANDATORY EMAIL CONFIRMATION)
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
        setVerifyPurpose("VERIFY_EMAIL");
        setVerifySynced(false);
        setStep("verify");
        setResendCooldown(60);
        setSuccessMsg("");
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
          setVerifyPurpose("VERIFY_EMAIL");
          setVerifySynced(false);
          setError("");
          setSuccessMsg("");
          setStep("verify");
          setResendCooldown(60);
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
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#fcfcfa] dark:bg-[#0e1311] text-[#0f1611] dark:text-[#f1f3ea] overflow-x-hidden overflow-y-auto transition-colors duration-300">
      {/* 1. FLOATING NAVBAR WITH LIGHT / DARK TOGGLE */}
      <MarketingNavbar />

      {/* 2. FULL-SCREEN RESPONSIVE SUNRISE (LIGHT) / STARRY NIGHT (DARK) LANDSCAPE */}
      <LandscapeIllustration className="fixed inset-0 w-full h-full object-cover" />

      {/* 3. FLOATING FROSTED GLASS SQUARES MATCHING SCREENSHOTS */}
      <CourseItFloatingSquares />

      {/* 4. CENTER FROSTED GLASSMORPHISM AUTH CARD MATCHING LIGHT & DARK REFERENCE SCREENSHOTS */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 pt-24 sm:pt-28 pb-10 w-full">
        <div className="relative w-full max-w-[424px] rounded-[28px] border border-white/65 dark:border-white/14 bg-white/25 dark:bg-[#0e1722]/45 backdrop-blur-xl p-7 sm:p-8 shadow-[0_24px_60px_-15px_rgba(22,49,92,0.16),inset_0_1px_1px_rgba(255,255,255,0.78)] dark:shadow-[0_28px_72px_-12px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.08)] text-center flex flex-col items-center transition-all duration-300">
          {/* Subtle crystal specular highlight letting the sky & mountains shine through */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-[28px] bg-gradient-to-b from-white/22 via-transparent to-white/5 dark:from-white/[0.04] dark:via-transparent dark:to-[#16315c]/15"
          />

          <div className="relative z-10 w-full flex flex-col items-center">
            {step === "choose" ? (
              !emailSectionOpen ? (
                <>
                  {/* Heading matching Reference Screenshot */}
                  <h1 className="text-[1.75rem] sm:text-[2rem] font-display font-medium tracking-tight text-[#0f1611] dark:text-[#f5f7f2] leading-tight">
                    Pick up where you{" "}
                    <em className="italic font-serif font-normal text-[#4b5e1e] dark:text-[#b8c460]">
                      left off.
                    </em>
                  </h1>

                  {/* Subtitle matching Reference Screenshot */}
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
                    <div className="w-full p-3 mb-4 rounded-2xl bg-[#eef2da]/80 dark:bg-[#b8c460]/15 border border-[#4b5e1e]/25 dark:border-[#b8c460]/30 text-xs text-[#3c4c16] dark:text-[#d5df88] font-medium text-center backdrop-blur-sm">
                      {successMsg}
                    </div>
                  )}

                  {/* Sheer Frosted Glass Pills matching Reference Glassmorphism */}
                  <div className="w-full space-y-2.5">
                    {/* Google OAuth */}
                    <button
                      type="button"
                      onClick={handleGoogleOAuth}
                      disabled={loading}
                      className="w-full h-12 px-5 rounded-full border border-[#0f1611]/14 dark:border-white/14 bg-white/15 hover:bg-white/35 dark:bg-white/[0.03] dark:hover:bg-white/[0.09] hover:border-[#0f1611]/25 dark:hover:border-white/28 text-[#0f1611] dark:text-white text-[0.84rem] sm:text-[0.88rem] font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer backdrop-blur-md active:scale-[0.99] disabled:opacity-50"
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

                    {/* Continue with Email */}
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSectionOpen(true);
                        setError("");
                        setSuccessMsg("");
                      }}
                      disabled={loading}
                      className="w-full h-12 px-5 rounded-full border border-[#0f1611]/14 dark:border-white/14 bg-white/15 hover:bg-white/35 dark:bg-white/[0.03] dark:hover:bg-white/[0.09] hover:border-[#0f1611]/25 dark:hover:border-white/28 text-[#0f1611] dark:text-white text-[0.84rem] sm:text-[0.88rem] font-medium flex items-center justify-center gap-2.5 transition-all cursor-pointer backdrop-blur-md active:scale-[0.99] disabled:opacity-50"
                    >
                      <svg
                        className="w-4 h-4 shrink-0 text-[#0f1611]/80 dark:text-white/85"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.9}
                        aria-hidden="true"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      <span>Continue with Email</span>
                    </button>
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
                /* Compact Frosted Glass Email Sign-In / Create Account View */
                <div className="w-full space-y-4 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEmailSectionOpen(false);
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="text-xs font-medium text-[#4c4c3d] dark:text-white/65 hover:text-[#0f1611] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      ← Back
                    </button>

                    <div className="inline-flex p-1 rounded-full bg-white/20 dark:bg-white/[0.05] border border-[#0f1611]/10 dark:border-white/12 text-[0.72rem] font-medium backdrop-blur-md">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode("password-login");
                          setError("");
                        }}
                        className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                          emailAuthMode === "password-login"
                            ? "bg-[#4b5e1e] text-[#f6f8ec] dark:bg-[#b8c460] dark:text-[#0f1611] shadow-xs"
                            : "text-[#4c4c3d] dark:text-white/65 hover:text-[#0f1611] dark:hover:text-white"
                        }`}
                      >
                        Sign in
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailAuthMode("password-signup");
                          setError("");
                        }}
                        className={`px-3.5 py-1 rounded-full transition-all cursor-pointer ${
                          emailAuthMode === "password-signup"
                            ? "bg-[#4b5e1e] text-[#f6f8ec] dark:bg-[#b8c460] dark:text-[#0f1611] shadow-xs"
                            : "text-[#4c4c3d] dark:text-white/65 hover:text-[#0f1611] dark:hover:text-white"
                        }`}
                      >
                        Create account
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <h1 className="text-2xl font-display font-medium tracking-tight text-[#0f1611] dark:text-[#f5f7f2] leading-tight">
                      {emailAuthMode === "password-signup" ? (
                        <>
                          Create your{" "}
                          <em className="italic font-serif font-normal text-[#4b5e1e] dark:text-[#b8c460]">
                            account.
                          </em>
                        </>
                      ) : (
                        <>
                          Sign in with{" "}
                          <em className="italic font-serif font-normal text-[#4b5e1e] dark:text-[#b8c460]">
                            email.
                          </em>
                        </>
                      )}
                    </h1>
                    <p className="text-xs text-[#4c4c3d] dark:text-white/65">
                      {emailAuthMode === "password-signup"
                        ? "Confirm once in your inbox, then sign in anytime."
                        : "Enter your verified email and password."}
                    </p>
                  </div>

                  {emailAuthMode === "password-signup" && !allowSignups && (
                    <div className="w-full p-3 rounded-2xl bg-amber-500/12 dark:bg-amber-400/15 border border-amber-700/25 dark:border-amber-300/30 text-xs text-amber-950 dark:text-amber-200 text-left leading-relaxed backdrop-blur-sm">
                      New account registrations are temporarily paused by an administrator.
                    </div>
                  )}

                  {error && (
                    <div className="w-full p-3 rounded-2xl bg-red-500/12 dark:bg-red-500/15 border border-red-600/25 dark:border-red-400/30 text-xs text-red-900 dark:text-red-200 text-left leading-relaxed backdrop-blur-sm">
                      {error}
                    </div>
                  )}

                  {successMsg && (
                    <div className="w-full p-3 rounded-2xl bg-[#eef2da]/80 dark:bg-[#b8c460]/15 border border-[#4b5e1e]/25 dark:border-[#b8c460]/30 text-xs text-[#3c4c16] dark:text-[#d5df88] font-medium text-center backdrop-blur-sm">
                      {successMsg}
                    </div>
                  )}

                  <form onSubmit={handlePasswordSubmit} className="space-y-2.5 text-left">
                    {emailAuthMode === "password-signup" && (
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="Full name"
                        className="w-full h-11 px-4 rounded-full border border-[#0f1611]/14 dark:border-white/14 bg-white/20 dark:bg-white/[0.04] backdrop-blur-md text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/65 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:bg-white/40 dark:focus:bg-white/[0.08] focus:border-[#4b5e1e] dark:focus:border-[#b8c460] transition-all"
                      />
                    )}
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="Email address"
                      className="w-full h-11 px-4 rounded-full border border-[#0f1611]/14 dark:border-white/14 bg-white/20 dark:bg-white/[0.04] backdrop-blur-md text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/65 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:bg-white/40 dark:focus:bg-white/[0.08] focus:border-[#4b5e1e] dark:focus:border-[#b8c460] transition-all"
                    />
                    <input
                      type="password"
                      required
                      minLength={emailAuthMode === "password-signup" ? 8 : 1}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={
                        emailAuthMode === "password-signup"
                          ? "Set password (min 8 characters)"
                          : "Password"
                      }
                      className="w-full h-11 px-4 rounded-full border border-[#0f1611]/14 dark:border-white/14 bg-white/20 dark:bg-white/[0.04] backdrop-blur-md text-[#0f1611] dark:text-white placeholder-[#4c4c3d]/65 dark:placeholder-white/40 text-xs sm:text-sm outline-none focus:bg-white/40 dark:focus:bg-white/[0.08] focus:border-[#4b5e1e] dark:focus:border-[#b8c460] transition-all"
                    />
                    <button
                      type="submit"
                      disabled={loading || (emailAuthMode === "password-signup" && !allowSignups)}
                      className="w-full h-11 mt-1 rounded-full bg-[#4b5e1e]/92 hover:bg-[#3c4c16] text-[#f6f8ec] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] dark:text-[#0f1611] font-semibold text-xs sm:text-sm transition-all cursor-pointer disabled:opacity-50 shadow-sm"
                    >
                      {loading
                        ? "Please wait..."
                        : emailAuthMode === "password-signup"
                        ? "Create Account & Verify →"
                        : "Sign In →"}
                    </button>
                  </form>

                  <p className="text-[0.7rem] text-[#4c4c3d] dark:text-white/55 text-center pt-1 leading-relaxed">
                    By continuing you agree to our{" "}
                    <Link
                      href="/terms"
                      className="underline underline-offset-2 hover:text-[#0f1611] dark:hover:text-white transition-colors"
                    >
                      Terms
                    </Link>{" "}
                    &amp;{" "}
                    <Link
                      href="/privacy"
                      className="underline underline-offset-2 hover:text-[#0f1611] dark:hover:text-white transition-colors"
                    >
                      Privacy policy
                    </Link>
                    .
                  </p>
                </div>
              )
            ) : (
              /* ================= STEP 2: EMAIL VERIFICATION SCREEN ================= */
              <div className="w-full space-y-5 py-2 flex flex-col items-center text-center">
                {/* Animated Mail / Verified Ring */}
                <div className="relative w-16 h-16 flex items-center justify-center">
                  {!verifySynced ? (
                    <>
                      <span
                        className="absolute inset-0 rounded-full border-2 border-[#4b5e1e]/20 dark:border-[#b8c460]/20"
                        aria-hidden="true"
                      />
                      <span
                        className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#4b5e1e] dark:border-t-[#b8c460] animate-spin"
                        style={{ animationDuration: "1.4s" }}
                        aria-hidden="true"
                      />
                      <div className="w-12 h-12 rounded-full bg-[#e4e9c6]/80 dark:bg-[#283117]/80 flex items-center justify-center text-[#4b5e1e] dark:text-[#b8c460]">
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.8}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] text-[#f6f8ec] dark:text-[#0f1611] flex items-center justify-center shadow-lg transition-all">
                      <svg
                        className="w-7 h-7"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.4}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-medium text-[#0f1611] dark:text-[#f5f7f2] tracking-tight">
                    {verifySynced ? (
                      <>
                        Email{" "}
                        <em className="italic font-serif text-[#4b5e1e] dark:text-[#b8c460]">
                          verified.
                        </em>
                      </>
                    ) : (
                      <>
                        Check your{" "}
                        <em className="italic font-serif text-[#4b5e1e] dark:text-[#b8c460]">
                          inbox.
                        </em>
                      </>
                    )}
                  </h2>

                  <p className="text-xs sm:text-[0.84rem] text-[#4c4c3d] dark:text-white/70 leading-relaxed max-w-[300px] mx-auto">
                    {verifySynced ? (
                      "Signing you in & opening your dashboard…"
                    ) : (
                      <>
                        We sent a confirmation link to{" "}
                        <strong className="text-[#0f1611] dark:text-white font-semibold break-all">
                          {pendingEmail}
                        </strong>
                        .
                      </>
                    )}
                  </p>
                </div>

                {/* Live Sync Status Pill */}
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/25 dark:bg-white/[0.06] border border-[#0f1611]/12 dark:border-white/14 backdrop-blur-md text-xs font-medium text-[#3c4c16] dark:text-[#d5df88]">
                  <span
                    className={`w-2 h-2 rounded-full bg-[#4b5e1e] dark:bg-[#b8c460] ${
                      verifySynced ? "" : "animate-pulse"
                    }`}
                  />
                  {verifySynced
                    ? "Redirecting to dashboard…"
                    : "Waiting for verification…"}
                </div>

                {error && (
                  <div className="w-full p-3 rounded-2xl bg-red-500/12 dark:bg-red-500/15 border border-red-600/25 dark:border-red-400/30 text-xs text-red-900 dark:text-red-200 text-center">
                    {error}
                  </div>
                )}

                {successMsg && !verifySynced && (
                  <div className="w-full px-3 py-2 rounded-2xl bg-[#eef2da]/90 dark:bg-[#b8c460]/15 border border-[#4b5e1e]/20 dark:border-[#b8c460]/25 text-xs text-[#3c4c16] dark:text-[#d5df88] font-medium">
                    {successMsg}
                  </div>
                )}

                {!verifySynced && (
                  <div className="w-full flex items-center justify-between pt-3 border-t border-[#0f1611]/10 dark:border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("choose");
                        setVerifySynced(false);
                        setError("");
                        setSuccessMsg("");
                      }}
                      className="text-[#4c4c3d] dark:text-white/60 hover:text-[#0f1611] dark:hover:text-white transition-colors cursor-pointer"
                    >
                      ← Use another email
                    </button>

                    <button
                      type="button"
                      disabled={loading || resendCooldown > 0}
                      onClick={() =>
                        handleSendEmailOtp(undefined, pendingEmail, verifyPurpose)
                      }
                      className="font-semibold text-[#4b5e1e] dark:text-[#b8c460] hover:underline disabled:opacity-45 cursor-pointer"
                    >
                      {resendCooldown > 0
                        ? `Resend in ${resendCooldown}s`
                        : "Resend email"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
