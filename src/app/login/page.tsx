"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CourseItLogo } from "@/components/CourseItLogo";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleModal, setShowGoogleModal] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Login failed");
      }

      const nextUrl =
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null) || "/dashboard";
      router.push(nextUrl);
    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (userEmail?: string) => {
    setGoogleLoading(true);
    setError("");

    const targetEmail = userEmail || googleEmailInput.trim() || email.trim() || "samee@gmail.com";
    const targetName = targetEmail.split("@")[0].replace(/[._]/g, " ");

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: targetEmail,
          name: targetName,
          avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(targetName)}&backgroundColor=b8c460`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Google authentication failed.");
      }

      setShowGoogleModal(false);
      const nextUrl =
        (typeof window !== "undefined"
          ? new URLSearchParams(window.location.search).get("next")
          : null) || "/dashboard";
      router.push(nextUrl);
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword(demoEmail.startsWith("admin") ? "adminpassword123" : "password123");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#090d0b] text-[#f0f4f1] p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        {/* Header Logo */}
        <div className="text-center space-y-2">
          <CourseItLogo size="lg" className="justify-center" />
          <h1 className="text-2xl sm:text-3xl font-display font-bold text-white pt-2">
            Welcome back to <span className="text-[#b8c460]">CourseIt</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#94a397]">
            Sign in to continue your personalized YouTube learning paths
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-[#101713] rounded-3xl border border-white/10 p-6 sm:p-8 shadow-2xl space-y-5">
          {error && (
            <div className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In Button */}
          <div>
            <button
              type="button"
              onClick={() => setShowGoogleModal(true)}
              disabled={googleLoading}
              className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-[#0f1611] font-semibold text-sm transition-all flex items-center justify-center gap-3 shadow-sm cursor-pointer"
            >
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
              <span>{googleLoading ? "Connecting to Google..." : "Continue with Google"}</span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex items-center justify-center">
            <div className="border-t border-white/10 w-full" />
            <span className="bg-[#101713] px-3 text-[0.7rem] uppercase tracking-wider text-[#94a397] font-semibold">
              or continue with email
            </span>
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#94a397] uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-[#090d0b] text-sm text-white placeholder-white/30 outline-none focus:border-[#b8c460] transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[#94a397] uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-white/10 bg-[#090d0b] text-sm text-white placeholder-white/30 outline-none focus:border-[#b8c460] transition-colors pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#94a397] hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-2xl bg-[#b8c460] hover:bg-[#a8b452] text-[#0f1611] font-semibold text-sm transition-all shadow-md cursor-pointer disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in with Email"}
            </button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="pt-2 border-t border-white/5 space-y-2">
            <p className="text-[0.68rem] font-bold text-[#b8c460] uppercase tracking-wider text-center">
              Quick Test Accounts
            </p>
            <div className="flex gap-2 justify-center">
              <button
                type="button"
                onClick={() => handleQuickDemo("learner@courseit.xyz")}
                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[0.72rem] font-semibold text-white/80 hover:bg-white/10"
              >
                Learner (12. Samee)
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemo("admin@courseit.xyz")}
                className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[0.72rem] font-semibold text-white/80 hover:bg-white/10"
              >
                Admin Demo
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Switcher */}
        <p className="text-center text-xs text-[#94a397]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[#b8c460] hover:underline font-semibold">
            Sign up for free
          </Link>
        </p>
      </div>

      {/* Google Sign-in Modal / Selector */}
      {showGoogleModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#121a15] rounded-3xl border border-white/10 max-w-sm w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <h3 className="text-sm font-bold text-white">Google Account Sign-In</h3>
              </div>
              <button
                onClick={() => setShowGoogleModal(false)}
                className="text-white/40 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#94a397]">
              Enter your Google email to authenticate or sign in instantly with 1-click:
            </p>

            <div className="space-y-2">
              <input
                type="email"
                value={googleEmailInput}
                onChange={(e) => setGoogleEmailInput(e.target.value)}
                placeholder="your.name@gmail.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-[#090d0b] text-sm text-white placeholder-white/30 outline-none focus:border-[#b8c460]"
              />

              <button
                type="button"
                onClick={() => handleGoogleSignIn()}
                disabled={googleLoading}
                className="w-full py-2.5 rounded-xl bg-[#b8c460] hover:bg-[#a8b452] text-[#0f1611] font-semibold text-xs transition-colors cursor-pointer"
              >
                {googleLoading ? "Signing in..." : "Continue with this Google Account"}
              </button>
            </div>

            <div className="pt-2 border-t border-white/5 space-y-1.5">
              <p className="text-[0.68rem] text-white/50 text-center uppercase tracking-wider">
                Or pick a quick Google profile
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn("samee.dev@gmail.com")}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs text-white"
                >
                  <p className="font-semibold truncate">Samee</p>
                  <p className="text-[0.65rem] text-white/50 truncate">samee.dev@gmail.com</p>
                </button>
                <button
                  type="button"
                  onClick={() => handleGoogleSignIn("alex.engineer@gmail.com")}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-left text-xs text-white"
                >
                  <p className="font-semibold truncate">Alex</p>
                  <p className="text-[0.65rem] text-white/50 truncate">alex.engineer@gmail.com</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
