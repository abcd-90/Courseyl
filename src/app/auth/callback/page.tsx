"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LandscapeIllustration } from "@/components/LandscapeHero";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Verifying your authentication session...");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    async function handleAuth() {
      try {
        const params = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(
          window.location.hash.replace(/^#/, "")
        );
        const nextUrl = params.get("next") || "/dashboard";
        const urlError =
          params.get("error_description") ||
          params.get("error") ||
          hashParams.get("error_description") ||
          hashParams.get("error");

        if (urlError) {
          throw new Error(urlError);
        }

        const code = params.get("code");
        const tokenHash = params.get("token_hash");
        const otpType = params.get("type");

        let accessToken: string | undefined;

        if (code) {
          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          accessToken = exchangeData?.session?.access_token;
        } else if (tokenHash && otpType) {
          const validType = (
            ["email", "magiclink", "signup", "recovery"].includes(otpType)
              ? otpType
              : "email"
          ) as "email" | "magiclink" | "signup" | "recovery";

          const { data: verifyData, error: verifyError } =
            await supabase.auth.verifyOtp({
              token_hash: tokenHash,
              type: validType,
            });
          if (verifyError) throw verifyError;
          accessToken = verifyData?.session?.access_token;
        } else {
          accessToken = hashParams.get("access_token") || undefined;
          if (!accessToken) {
            const { data, error } = await supabase.auth.getSession();
            if (error) throw error;
            accessToken = data?.session?.access_token;
          }
        }

        if (!accessToken) {
          throw new Error(
            "Verification link expired or invalid. Please sign in again."
          );
        }

        const res = await fetch("/api/auth/social", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accessToken }),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error || "Failed to verify user session.");
        }

        setStatus("Verified! Taking you to your workspace...");
        const safeNext =
          nextUrl.startsWith("/") && !nextUrl.startsWith("//")
            ? nextUrl
            : "/dashboard";
        router.replace(safeNext);
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Authentication verification failed.";
        console.error("Auth callback error:", msg);
        setErrorMsg(msg);
        setStatus("Verification unsuccessful. Returning to sign in...");
        setTimeout(() => {
          router.replace(`/login?error=${encodeURIComponent(msg)}`);
        }, 1200);
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="relative min-h-screen bg-paper text-ink flex flex-col justify-between overflow-hidden">
      <MarketingNavbar />
      <LandscapeIllustration className="opacity-70" />
      <main className="relative z-20 flex-1 flex items-center justify-center p-6 pt-28">
        <div className="w-full max-w-[400px] rounded-[28px] bg-white/65 dark:bg-[#131e26]/75 backdrop-blur-2xl border border-white/75 dark:border-white/15 p-8 shadow-2xl text-center space-y-3">
          {!errorMsg ? (
            <div className="w-7 h-7 mx-auto border-2 border-[#4b5e1e] dark:border-[#b8c460] border-t-transparent rounded-full animate-spin" />
          ) : (
            <div className="w-9 h-9 mx-auto rounded-full bg-err-bg text-err-fg flex items-center justify-center font-bold text-sm">
              !
            </div>
          )}
          <p className="text-sm font-semibold text-ink">{status}</p>
          {errorMsg && <p className="text-xs text-err-fg">{errorMsg}</p>}
        </div>
      </main>
    </div>
  );
}
