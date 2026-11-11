"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function BillingPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const { settings } = useSiteSettings();
  const isUnlimitedFree = settings?.plans?.unlimitedFreeMode === true || data?.unlimitedFreeMode === true;
  const [message, setMessage] = useState("");
  const [dates, setDates] = useState({ today: "Active Period", end: "End of billing cycle" });

  useEffect(() => {
    fetch("/api/billing")
      .then((res) => res.json())
      .then((d) => {
        setData(d);
        if (d?.subscription?.currentPeriodEnd) {
          setDates({
            today: new Date().toLocaleDateString(),
            end: new Date(d.subscription.currentPeriodEnd).toLocaleDateString(),
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel your paid subscription and revert to the Free tier?")) return;
    setCancelling(true);
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      if (res.ok) {
        setMessage("Subscription successfully reverted to Free tier.");
        const refreshed = await fetch("/api/billing").then((r) => r.json());
        setData(refreshed);
      }
    } catch (err) {
      console.error(err);
      setMessage("Failed to cancel subscription.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex bg-paper text-ink">
        <AppSidebar />
        <div className="flex-1 p-12 text-sm text-ink-soft">Loading billing & quota details...</div>
      </div>
    );
  }

  const sub = data?.subscription;
  const limits = data?.limits;
  const isFree = !sub || sub?.tier === "FREE";

  const tierName =
    sub?.tier === "MAX"
      ? settings?.plans?.maxPlanName || "Max"
      : sub?.tier === "PRO"
      ? settings?.plans?.proPlanName || "Pro"
      : settings?.plans?.freePlanName || "Free";

  const coursesUsed = sub?.monthlyGenerationsUsed || 0;
  const maxCourses = isUnlimitedFree ? 9999 : limits?.maxCoursesPerMonth || 5;
  const coursePercent = isUnlimitedFree ? 100 : Math.min(100, Math.round((coursesUsed / maxCourses) * 100));

  const hoursUsed = sub?.monthlyHoursUsed || 0;
  const maxHours = isUnlimitedFree ? 9999 : limits?.maxTotalHoursMonth || (sub?.tier === "MAX" ? 40 : sub?.tier === "PRO" ? 20 : 5);
  const hoursPercent = isUnlimitedFree ? 100 : Math.min(100, Math.round((hoursUsed / maxHours) * 100));

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-paper text-ink">
      <AppSidebar />

      <main className="w-full min-w-0 flex-1 p-4 sm:p-6 md:p-8 overflow-y-auto max-w-4xl">
        {/* Breadcrumb */}
        <div className="mb-2">
          <span className="text-[0.7rem] font-bold text-ink-soft/70 tracking-widest uppercase">
            Settings · Billing & Quotas
          </span>
        </div>

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-display font-bold text-ink">
              Manage your <span className="italic text-moss font-serif">plan.</span>
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-ink-soft">
              Review your monthly hours bank, course generation limits, and active subscription.
            </p>
          </div>

          <Link
            href="/pricing"
            className="inline-flex items-center px-5 py-2.5 rounded-full bg-primary text-primary-foreground text-xs sm:text-sm font-semibold hover:bg-moss-dark transition-transform hover:-translate-y-0.5 shadow-sm self-start sm:self-auto"
          >
            Upgrade plan →
          </Link>
        </div>

        {message && (
          <div className="mt-6 p-4 rounded-2xl bg-lime-soft text-moss text-xs sm:text-sm font-semibold">
            {message}
          </div>
        )}

        {/* Current Plan Card */}
        <div className="mt-8 bg-surface rounded-3xl border border-line p-6 sm:p-8 shadow-sm space-y-6 text-ink">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-line">
            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-lime-soft text-moss text-xs font-bold uppercase tracking-wider mb-2">
                {isUnlimitedFree ? "Active Mode: Unlimited Free" : `Active Plan: ${tierName}`}
              </span>
              <h2 className="text-2xl font-display font-bold text-ink">
                {isUnlimitedFree ? "Full Free Access" : `${tierName} Plan`}
              </h2>
              <p className="text-xs sm:text-sm text-ink-soft mt-1">
                {isUnlimitedFree
                  ? "Unlimited hours/month · Full AI generation unlocked free by admin"
                  : sub?.tier === "MAX"
                  ? `${maxHours} hours/month · Private courses · Priority AI support`
                  : sub?.tier === "PRO"
                  ? `${maxHours} hours/month · Private courses · Priority building`
                  : `${maxHours} hours/month · Public community courses`}
              </p>
            </div>

            <div className="text-right">
              <div className="text-3xl font-display font-bold text-ink">
                {isUnlimitedFree
                  ? `${settings?.plans?.currencySymbol || "$"}0`
                  : sub?.tier === "MAX"
                  ? `${settings?.plans?.currencySymbol || "$"}${settings?.plans?.maxPriceMonthly ?? 49}`
                  : sub?.tier === "PRO"
                  ? `${settings?.plans?.currencySymbol || "$"}${settings?.plans?.proPriceMonthly ?? 19}`
                  : `${settings?.plans?.currencySymbol || "$"}0`}
                <span className="text-xs font-normal text-ink-soft"> / month</span>
              </div>
              <span className="text-xs text-ink-soft">
                {isUnlimitedFree ? "Full free access enabled" : `Renews ${dates.end}`}
              </span>
            </div>
          </div>

          {/* Usage Meters */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-sidebar border border-line space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink">Hours used this cycle</span>
                <span className="text-moss">
                  {isUnlimitedFree ? "Unlimited" : `${hoursUsed}h / ${maxHours}h`}
                </span>
              </div>
              <div className="w-full bg-lime-soft h-2 rounded-full overflow-hidden">
                <div
                  className="bg-moss h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(5, hoursPercent)}%` }}
                />
              </div>
              <p className="text-[0.72rem] text-ink-soft">
                {isUnlimitedFree
                  ? "Unlimited video processing hours active."
                  : `${Math.max(0, maxHours - hoursUsed)} hours remaining to turn YouTube videos into interactive courses.`}
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-sidebar border border-line space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-ink">Courses generated</span>
                <span className="text-moss">
                  {isUnlimitedFree ? `${coursesUsed} / Unlimited` : `${coursesUsed} / ${maxCourses}`}
                </span>
              </div>
              <div className="w-full bg-lime-soft h-2 rounded-full overflow-hidden">
                <div
                  className="bg-moss h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(10, coursePercent)}%` }}
                />
              </div>
              <p className="text-[0.72rem] text-ink-soft">
                Community courses you join do not consume any hours or generations.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex flex-wrap items-center justify-between gap-4 border-t border-line">
            <div className="text-xs text-ink-soft">
              Billing cycle period: <strong>{dates.today} – {dates.end}</strong>
            </div>

            <div className="flex items-center gap-3">
              {!isFree ? (
                <button
                  onClick={handleCancel}
                  disabled={cancelling}
                  className="px-4 py-2 rounded-full border border-red-300 dark:border-red-900 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {cancelling ? "Cancelling..." : "Cancel subscription"}
                </button>
              ) : (
                <Link
                  href="/pricing"
                  className="px-4 py-2 rounded-full bg-lime-soft text-moss text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Upgrade to Pro or Max
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Guarantee Info Banner */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3 text-ink">
            <span className="text-moss text-lg font-bold">✓</span>
            <span className="text-xs font-medium text-ink">Existing courses don&apos;t use hours</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3 text-ink">
            <span className="text-moss text-lg font-bold">✓</span>
            <span className="text-xs font-medium text-ink">Unused hours don&apos;t expire</span>
          </div>
          <div className="p-4 rounded-2xl bg-surface border border-line flex items-center gap-3 text-ink">
            <span className="text-moss text-lg font-bold">✓</span>
            <span className="text-xs font-medium text-ink">Cancel or change any time</span>
          </div>
        </div>
      </main>
    </div>
  );
}
