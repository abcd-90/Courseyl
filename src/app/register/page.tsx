"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : ""
    );
    if (!params.get("mode")) {
      params.set("mode", "signup");
    }
    router.replace(`/login?${params.toString()}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-paper text-ink flex items-center justify-center">
      <div className="flex items-center gap-3 text-sm text-moss">
        <div className="w-5 h-5 border-2 border-moss border-t-transparent rounded-full animate-spin" />
        <span>Loading registration...</span>
      </div>
    </div>
  );
}
