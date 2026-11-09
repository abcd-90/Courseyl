"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  useEffect(() => {
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/login${search}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0e1311] flex items-center justify-center text-white">
      <div className="flex items-center gap-3 text-sm text-[#b8c460]">
        <div className="w-5 h-5 border-2 border-[#b8c460] border-t-transparent rounded-full animate-spin" />
        <span>Redirecting to authentication...</span>
      </div>
    </div>
  );
}
