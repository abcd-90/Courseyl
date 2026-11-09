"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState("Completing authentication...");

  useEffect(() => {
    async function handleAuth() {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (data?.session?.user) {
          const user = data.session.user;
          const email = user.email;
          const name =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            email?.split("@")[0] ||
            "Learner";
          const avatarUrl =
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
              name
            )}&backgroundColor=b8c460`;

          // Sync with our PostgreSQL database and set session cookie
          const res = await fetch("/api/auth/social", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              provider: user.app_metadata?.provider || "Google",
              email,
              name,
              avatarUrl,
            }),
          });

          if (!res.ok) {
            throw new Error("Failed to sync user session.");
          }

          setStatus("Authenticated! Redirecting to your dashboard...");
          const nextUrl =
            new URLSearchParams(window.location.search).get("next") || "/dashboard";
          router.replace(nextUrl);
        } else {
          // Check if code param exists in search
          const code = new URLSearchParams(window.location.search).get("code");
          if (code) {
            const { data: exchangeData, error: exchangeError } =
              await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) throw exchangeError;
            if (exchangeData?.user?.email) {
              const u = exchangeData.user;
              const uEmail = u.email || "";
              await fetch("/api/auth/social", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  provider: "Google",
                  email: uEmail,
                  name: u.user_metadata?.full_name || uEmail.split("@")[0] || "Learner",
                  avatarUrl: u.user_metadata?.avatar_url,
                }),
              });
              router.replace("/dashboard");
              return;
            }
          }
          router.replace("/dashboard");
        }
      } catch (err: any) {
        console.error("Auth callback error:", err);
        setStatus("Redirecting to dashboard...");
        router.replace("/dashboard");
      }
    }

    handleAuth();
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0e1311] flex flex-col items-center justify-center p-4 text-white">
      <div className="flex items-center gap-3 text-sm text-[#b8c460]">
        <div className="w-6 h-6 border-2 border-[#b8c460] border-t-transparent rounded-full animate-spin" />
        <span>{status}</span>
      </div>
    </div>
  );
}
