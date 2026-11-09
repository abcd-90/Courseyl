"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { NightLandscapeIllustration } from "@/components/LandscapeHero";
import { supabase } from "@/lib/supabaseClient";

export function CourseItFloatingSquares() {
  return (
    <>
      {/* Floating Glass Squares matching Reference Screenshot */}
      <div
        className="hidden md:block absolute left-12 lg:left-24 bottom-[32%] w-12 h-12 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md shadow-2xl pointer-events-none select-none z-10"
        aria-hidden="true"
      />
      <div
        className="hidden md:block absolute left-20 lg:left-36 bottom-[22%] w-11 h-11 rounded-2xl border border-white/15 bg-white/5 backdrop-blur-md shadow-2xl pointer-events-none select-none z-10"
        aria-hidden="true"
      />
      <div
        className="hidden md:block absolute right-12 lg:right-32 bottom-[26%] w-12 h-12 rounded-2xl border border-white/20 bg-white/5 backdrop-blur-md shadow-2xl pointer-events-none select-none z-10"
        aria-hidden="true"
      />
    </>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [emailInput, setEmailInput] = useState("");
  const [showPasswordOption, setShowPasswordOption] = useState(false);
  const [password, setPassword] = useState("");

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      const err = new URLSearchParams(window.location.search).get("error");
      if (err) {
        setError(err);
      }
    }
  }, []);

  const getNextUrl = () => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("next") || "/dashboard";
    }
    return "/dashboard";
  };

  // 1. OFFICIAL GOOGLE OAUTH LOGIN (Opens Google Account Picker)
  const handleGoogleOAuth = () => {
    setLoading(true);
    setError("");
    setSuccessMsg("Opening Google account selector...");
    const nextUrl = getNextUrl();
    window.location.href = `/api/auth/google?next=${encodeURIComponent(nextUrl)}`;
  };

  // 2. OFFICIAL GITHUB OAUTH LOGIN
  const handleGitHubOAuth = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://courseyl.vercel.app";

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "github",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(getNextUrl())}`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error("GitHub sign in error:", err);
      setError(
        err.message ||
          "GitHub OAuth is not yet enabled in Supabase Dashboard. Enter your email below to sign in instantly!"
      );
      setLoading(false);
    }
  };

  // 3. X (TWITTER) OAUTH LOGIN
  const handleXOAuth = async () => {
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://courseyl.vercel.app";

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "twitter",
        options: {
          redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(getNextUrl())}`,
        },
      });

      if (oauthError) {
        throw oauthError;
      }
    } catch (err: any) {
      console.error("X sign in error:", err);
      setError(
        err.message ||
          "X (Twitter) OAuth is not yet enabled. Enter your email below to sign in instantly!"
      );
      setLoading(false);
    }
  };

  // 3. FAST REAL EMAIL LOGIN ("with just mail")
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = emailInput.trim();
    if (!targetEmail) return;

    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to sign in with this email.");
      }

      setSuccessMsg(`Welcome! Signing you in as ${targetEmail}...`);
      setTimeout(() => {
        router.push(getNextUrl());
      }, 400);
    } catch (err: any) {
      setError(err.message || "Failed to sign in. Please verify your email.");
    } finally {
      setLoading(false);
    }
  };

  // 4. TRADITIONAL EMAIL + PASSWORD (FOR ADMIN)
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailInput.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid email or password.");
      }

      router.push(getNextUrl());
    } catch (err: any) {
      setError(err.message || "Invalid credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full flex flex-col justify-between bg-[#0e1311] text-white overflow-hidden select-none">
      {/* 1. TOP MARKETING NAVBAR */}
      <MarketingNavbar />

      {/* 2. FULL-SCREEN NIGHT LANDSCAPE BACKGROUND ILLUSTRATION */}
      <NightLandscapeIllustration />

      {/* 3. FLOATING GLASS SQUARES */}
      <CourseItFloatingSquares />

      {/* 4. CENTER AUTHENTICATION CARD MATCHING REFERENCE SCREENSHOT 100% */}
      <main className="relative z-20 flex-1 flex items-center justify-center px-4 pt-24 pb-12 w-full">
        <div className="w-full max-w-[440px] bg-[#101713]/85 backdrop-blur-xl rounded-[32px] border border-white/10 p-7 sm:p-9 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)] text-center flex flex-col items-center">
          {/* Top Pill Badge */}
          <div className="inline-flex items-center px-3.5 py-1 rounded-full bg-[#182315] border border-[#2b3d1f] text-[0.72rem] font-medium text-[#b8c460] mb-5 tracking-tight">
            No distraction between your studies
          </div>

          {/* Heading */}
          <h1 className="text-3xl sm:text-[2.1rem] font-display font-bold text-white tracking-tight leading-snug">
            Pick up where <br />
            you <span className="italic font-serif text-[#b8c460]">left off.</span>
          </h1>

          {/* Subtitle */}
          <p className="text-xs sm:text-[0.82rem] text-white/60 mt-2 mb-6">
            Your streak, your plan and your notes are waiting.
          </p>

          {/* Error Message if any */}
          {error && (
            <div className="w-full p-3 mb-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-xs text-red-300 text-left leading-relaxed">
              {error}
            </div>
          )}

          {/* Success Message if any */}
          {successMsg && (
            <div className="w-full p-3 mb-4 rounded-2xl bg-[#b8c460]/10 border border-[#b8c460]/30 text-xs text-[#b8c460] font-semibold text-center animate-in fade-in">
              {successMsg}
            </div>
          )}

          {/* Social Auth Buttons Stack */}
          <div className="w-full space-y-3">
            {/* 1. Continue with Google (Official Google OAuth) */}
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
            >
              {/* Google G Icon */}
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
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

            {/* 2. Continue with GitHub */}
            <button
              type="button"
              onClick={handleGitHubOAuth}
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-4 h-4 fill-white shrink-0" viewBox="0 0 24 24">
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                />
              </svg>
              <span>Continue with GitHub</span>
            </button>

            {/* 3. Continue with X (matching Reference Screenshot) */}
            <button
              type="button"
              onClick={handleXOAuth}
              disabled={loading}
              className="w-full py-3.5 px-5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 hover:border-white/25 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-3 transition-all cursor-pointer shadow-xs active:scale-[0.99] disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 fill-white shrink-0" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span>Continue with X</span>
            </button>

            {/* Subtle Divider */}
            <div className="flex items-center gap-3 my-2 pt-1">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-[0.68rem] uppercase font-mono text-white/40 tracking-wider">
                or with email
              </span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            {/* 3. REAL EMAIL INPUT ("with just mail") */}
            <form onSubmit={handleEmailSubmit} className="w-full space-y-2">
              <div className="relative flex items-center">
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full py-3.5 pl-4 pr-28 rounded-2xl border border-white/15 bg-white/5 hover:border-white/30 text-white placeholder-white/40 text-xs sm:text-sm outline-none focus:border-[#b8c460] focus:ring-1 focus:ring-[#b8c460]/40 transition-all shadow-inner"
                />
                <button
                  type="submit"
                  disabled={loading || !emailInput.trim()}
                  className="absolute right-1.5 px-3.5 py-2 rounded-xl bg-[#b8c460] text-[#0f1611] font-bold text-xs hover:bg-[#a6b350] transition-colors disabled:opacity-40 cursor-pointer shadow-xs flex items-center gap-1"
                >
                  {loading ? (
                    <div className="w-3.5 h-3.5 border-2 border-[#0f1611] border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue</span>
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Legal Disclaimer matching Reference Screenshot */}
          <p className="text-[0.7rem] text-white/50 text-center mt-6 leading-relaxed">
            By continuing you agree to our{" "}
            <Link href="/terms" className="underline hover:text-white transition-colors">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="underline hover:text-white transition-colors">
              Privacy policy
            </Link>
            .
          </p>

          {/* Optional Password toggle for Admin */}
          <div className="w-full mt-3 pt-2">
            <button
              type="button"
              onClick={() => setShowPasswordOption(!showPasswordOption)}
              className="text-[0.65rem] text-white/30 hover:text-white/60 transition-colors cursor-pointer"
            >
              {showPasswordOption ? "Hide password field ↑" : "Sign in with password instead"}
            </button>

            {showPasswordOption && (
              <form onSubmit={handlePasswordLogin} className="mt-2.5 space-y-2 text-left animate-in fade-in duration-200">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full py-2.5 px-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-white/30 text-xs outline-none focus:border-[#b8c460]"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Sign in with password
                </button>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
