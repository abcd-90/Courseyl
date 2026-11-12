"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { useSiteSettings } from "@/components/SiteSettingsProvider";
import { Lock } from "lucide-react";

export default function SupportPage() {
  const { settings } = useSiteSettings();
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.user) {
          setCurrentUser(data.user);
        }
      })
      .catch(() => {});
  }, []);

  const brandName = settings?.branding?.brandName || "Courseyl";
  const userEmail = currentUser?.email || "your account email";
  const supportEmail = "thecourseyl@gmail.com";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#fafcf7] dark:bg-[#0c120e] text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-6 md:p-12 overflow-y-auto max-w-4xl">
        <div className="space-y-8">
          <div>
            <span className="text-[0.68rem] font-bold uppercase tracking-wider text-ink-soft/80 font-mono">
              SUPPORT
            </span>
            <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink tracking-tight mt-2">
              We&apos;re here{" "}
              <em className="italic text-[#4b5e1e] dark:text-[#b8c460] font-serif">
                to help.
              </em>
            </h1>
          </div>

          {/* Card 1: Email Us */}
          <div className="rounded-3xl border border-line dark:border-white/10 bg-white dark:bg-[#121815] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <h2 className="text-base font-bold text-ink">Email us</h2>
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                Write to{" "}
                <a
                  href={`mailto:${supportEmail}`}
                  className="font-medium text-ink underline"
                >
                  {supportEmail}
                </a>
                . A person reads every message. Send from{" "}
                <span className="font-medium text-ink">{userEmail}</span> so we
                can find your account.
              </p>
            </div>
            <a
              href={`mailto:${supportEmail}?subject=${encodeURIComponent(
                `${brandName} Support Request - ${userEmail}`
              )}`}
              className="inline-flex items-center justify-center px-6 py-2.5 rounded-full bg-[#3d4c18] hover:bg-[#2e3b12] dark:bg-[#b8c460] dark:hover:bg-[#a6b350] text-white dark:text-[#0f1611] text-xs sm:text-sm font-semibold transition-all shrink-0 shadow-xs text-center cursor-pointer"
            >
              Email support
            </a>
          </div>

          {/* Card 2: Chat with us */}
          <div className="rounded-3xl border border-line dark:border-white/10 bg-white dark:bg-[#121815] p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5 max-w-xl">
              <div className="flex items-center gap-2">
                <Lock className="w-3.5 h-3.5 text-ink-soft shrink-0" />
                <h2 className="text-base font-bold text-ink">Chat with us</h2>
              </div>
              <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                Telegram support on Pro. WhatsApp and priority support on Max.
              </p>
            </div>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center px-6 py-2 rounded-full border border-line dark:border-white/15 bg-surface dark:bg-white/5 text-xs sm:text-sm font-semibold text-ink hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0 text-center cursor-pointer"
            >
              See plans
            </Link>
          </div>

          {/* Quick Answers Section */}
          <div className="pt-4 space-y-6">
            <h2 className="text-lg font-display font-bold text-ink">
              Quick answers
            </h2>

            <div className="space-y-5 text-xs sm:text-sm">
              <div className="space-y-1">
                <h3 className="font-semibold text-ink">
                  Billing, cards and cancelling
                </h3>
                <p className="text-ink-soft leading-relaxed">
                  Change your card, switch plans or cancel from{" "}
                  <Link href="/settings" className="font-medium text-ink underline">
                    Settings → Manage billing
                  </Link>
                  . Invoices are under Billing history in the same place. For refunds,
                  see the{" "}
                  <Link href="/refunds" className="font-medium text-ink underline">
                    Refund policy
                  </Link>{" "}
                  and email us; we reply within 3–5 working days.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-ink">Used up your hours?</h3>
                <p className="text-ink-soft leading-relaxed">
                  Plans are measured in hours of video built into new courses, and each
                  build&apos;s hours come back after 30 days. Joining a course someone
                  already built is always free. See{" "}
                  <Link href="/pricing" className="font-medium text-ink underline">
                    Plans
                  </Link>{" "}
                  for more hours.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-ink">
                  A course didn&apos;t finish building
                </h3>
                <p className="text-ink-soft leading-relaxed">
                  Open it and choose Retry. It keeps every lesson that&apos;s done
                  and only builds what&apos;s missing. Still stuck? Email us the link.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="font-semibold text-ink">
                  Something looks wrong in a lesson
                </h3>
                <p className="text-ink-soft leading-relaxed">
                  Email us the course link and which lesson, and what you expected to
                  see.
                </p>
              </div>
            </div>

            <p className="text-xs text-ink-soft/75 pt-4">
              {brandName}.{" "}
              <Link href="/terms" className="underline hover:text-ink">
                Terms
              </Link>{" "}
              ·{" "}
              <Link href="/privacy" className="underline hover:text-ink">
                Privacy
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

