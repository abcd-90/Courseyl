"use client";

import React, { useState } from "react";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import { useSiteSettings } from "@/components/SiteSettingsProvider";

export default function PricingPage() {
  const { settings } = useSiteSettings();
  const [isYearly, setIsYearly] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [checkoutModal, setCheckoutModal] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const plans = settings.plans;
  const brandName = settings.branding?.brandName || "Courseyl";
  const isUnlimitedFree = plans?.unlimitedFreeMode === true;
  const curr = plans?.currencySymbol || "$";
  const freeName = plans?.freePlanName || "Free";
  const proName = plans?.proPlanName || "Pro";
  const maxName = plans?.maxPlanName || "Max";
  const freeHours = plans?.freeHoursLimit && plans.freeHoursLimit < 999 ? plans.freeHoursLimit : 5;
  const proMonthly = plans?.proPriceMonthly ?? 19;
  const proYearly = plans?.proPriceYearly ?? Math.max(1, Math.round(proMonthly * 0.8));
  const proHours = plans?.proHoursLimit ?? 20;
  const maxMonthly = plans?.maxPriceMonthly ?? 49;
  const maxYearly = plans?.maxPriceYearly ?? Math.max(1, Math.round(maxMonthly * 0.8));
  const maxHours = plans?.maxHoursLimit ?? 40;

  const faqs = [
    {
      q: "What uses my hours?",
      a: "Building a new course from a YouTube link uses my hours as listed on my plan. A 0-2 hours playlist uses 2 hours. If the course already exists, it is permanently free and uses nothing.",
    },
    {
      q: "How many courses is that?",
      a: `The typical course built on ${brandName} is about 5 hours of video. ${freeName} gives ${freeHours}h/mo, ${proName} gives ${proHours}h/mo, and ${maxName} gives ${maxHours}h/mo.`,
    },
    {
      q: "When do my hours come back?",
      a: `On ${freeName}, your ${freeHours} hours renew every month on the day you signed up. Unused hours don't carry over. On ${proName} and ${maxName}, every bank of hours renews each billing cycle.`,
    },
    {
      q: "What if a video is too long for my plan?",
      a: `We tell you before anything builds. ${freeName} supports up to ${freeHours}h, ${proName} up to ${proHours}h and ${maxName} up to ${maxHours}h monthly.`,
    },
    {
      q: "Who can see the courses I build?",
      a: "On Free, every course you build is public and listed in Community for anyone else who wants to join. On Pro and Max, your courses stay private unless you choose to share them.",
    },
    {
      q: "What if a build fails?",
      a: "If it stops before any lesson is written, it doesn't use your hours. On Pro and Max, every build picks up where it stopped and keeps every lesson already written.",
    },
    {
      q: "Can I cancel?",
      a: "Any time, from Settings - Manage billing. You keep your plan until the end of the period you paid for, and every course you built is always yours.",
    },
    {
      q: "Who handles payments?",
      a: "Dodo Payments, our merchant of record. They take cards worldwide, handle sales tax and send an invoice for every payment. We never see your card details.",
    },
    {
      q: "Are taxes included?",
      a: "In India, prices exclude GST (added at 18%). They include VAT/relevant consumption tax elsewhere and any applicable VAT is calculated at checkout.",
    },
    {
      q: "Can I get a refund?",
      a: "Within 7 days of a charge if you haven't built a new course with it. Email us and we reply within 3-4 working days. See the Refund policy.",
    },
  ];

  const handleSubscribe = async (tier: string) => {
    setProcessing(true);
    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tier,
          billingCycle: isYearly ? "YEARLY" : "MONTHLY",
          interval: isYearly ? "yearly" : "monthly",
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessMessage(`Successfully upgraded to ${tier} Plan!`);
        setTimeout(() => {
          setCheckoutModal(null);
          setSuccessMessage("");
        }, 2000);
      } else {
        alert(data.error || "Checkout failed. Please login first.");
      }
    } catch {
      alert("Failed to complete checkout.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <MarketingNavbar />

      <main className="flex-1 py-14 px-6 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink mb-3">
            Pricing
          </div>
          <h1 className="text-3xl sm:text-5xl font-display font-medium tracking-tight text-ink leading-tight">
            Learn from any course. <br />
            <span className="italic text-moss font-serif">Pay only to build new ones.</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-ink-soft">
            Courses others share are always free to join. Subscribe only to convert new YouTube videos you want into personalized courses.
          </p>

          {/* Billing Switcher matching CourseIt */}
          {isUnlimitedFree ? (
            <div className="mt-7 mx-auto max-w-xl rounded-2xl bg-lime-soft border border-moss/25 px-5 py-3.5 text-sm font-medium text-pill-ink shadow-xs">
              🎉 <strong>Full Free Access Mode is Active!</strong> All courses, AI generation, and unlimited hours are currently unlocked 100% free for every user.
            </div>
          ) : null}

          <div className="mt-8 flex justify-center">
            <div role="radiogroup" aria-label="Billing period" className="inline-flex rounded-full bg-surface p-1 shadow-[0_0_0_1px_var(--line)]">
              <button
                type="button"
                role="radio"
                aria-checked={!isYearly}
                onClick={() => setIsYearly(false)}
                className={`rounded-full px-4 py-2 text-[0.9rem] font-medium transition-colors ${
                  !isYearly ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                Monthly
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={isYearly}
                onClick={() => setIsYearly(true)}
                className={`rounded-full px-4 py-2 text-[0.9rem] font-medium transition-colors ${
                  isYearly ? "bg-ink text-paper" : "text-ink-soft hover:text-ink"
                }`}
              >
                Yearly, 2 months free
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <ul className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 items-stretch list-none p-0">
          {/* Free Tier */}
          <li className="flex flex-col justify-between gap-5 rounded-[24px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)]">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-ink">{freeName}</h3>
                <span className="text-xs text-ink-soft">Try it out, no card needed</span>
              </div>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-ink">{curr}0</span>
                <span className="text-xs text-ink-soft">forever</span>
              </div>

              <div className="mt-4 block w-full py-1.5 px-3 rounded-full bg-lime-soft text-pill-ink text-center text-xs font-bold">
                {isUnlimitedFree ? "Unlimited Free Mode" : `${freeHours} hours / month`}
              </div>

              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-ink-soft">
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>{isUnlimitedFree ? "Unlimited video hours unlocked" : `${freeHours} hours to build courses free`}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>{isUnlimitedFree ? "Full multi-hour AI courses" : `Courses up to ${freeHours} hours`}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Notes, quizzes and placement tests</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Daily plan and reminders</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                onClick={() => (window.location.href = "/dashboard")}
                className="w-full h-12 rounded-full border border-transparent bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted font-medium text-[0.92rem] transition-colors cursor-pointer"
              >
                {isUnlimitedFree ? "Start Unlimited Free" : "Start free"}
              </button>
            </div>
          </li>

          {/* Pro Tier (Featured) */}
          <li className="relative flex flex-col justify-between gap-5 rounded-[24px] bg-surface p-6 shadow-[0_0_0_2px_var(--moss)]">
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-lime-soft px-3 py-0.5 font-medium text-moss text-xs shadow-sm">
              Most popular
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-ink">{proName}</h3>
                <span className="whitespace-nowrap rounded-full bg-lime-soft px-2 py-0.5 font-medium text-moss text-xs">
                  {isUnlimitedFree ? "🎉 Free Now" : "✨ Early-user price"}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">For learning every week</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-ink">
                  {curr}{isYearly ? proYearly : proMonthly}
                </span>
                <span className="text-xs text-ink-soft">/ month</span>
              </div>

              <div className="mt-4 block w-full py-1.5 px-3 rounded-full bg-lime-soft text-pill-ink text-center text-xs font-bold">
                {proHours} hours / month
              </div>

              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-ink-soft">
                <li className="flex items-center gap-2 font-medium text-ink">
                  <span className="text-moss font-bold">✓</span>
                  <span>Everything in {freeName}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Courses up to {proHours} hours monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Your courses stay private</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Priority AI processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Priority course building</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Telegram support</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                onClick={() => (isUnlimitedFree ? (window.location.href = "/dashboard") : setCheckoutModal("PRO"))}
                className="w-full h-12 rounded-full bg-primary text-primary-foreground hover:bg-moss-dark hover:-translate-y-px transition-all font-medium text-[0.92rem] shadow-sm cursor-pointer"
              >
                {isUnlimitedFree ? "Included in Free Mode" : `Get ${proName}`}
              </button>
            </div>
          </li>

          {/* Max Tier */}
          <li className="flex flex-col justify-between gap-5 rounded-[24px] bg-surface p-6 shadow-[0_0_0_1px_var(--line)]">
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold text-ink">{maxName}</h3>
                <span className="whitespace-nowrap rounded-full bg-lime-soft px-2 py-0.5 font-medium text-moss text-xs">
                  {isUnlimitedFree ? "🎉 Free Now" : "✨ Early-user price"}
                </span>
              </div>
              <p className="text-xs text-ink-soft mt-0.5">For serial learners and power users</p>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-display font-bold text-ink">
                  {curr}{isYearly ? maxYearly : maxMonthly}
                </span>
                <span className="text-xs text-ink-soft">/ month</span>
              </div>

              <div className="mt-4 block w-full py-1.5 px-3 rounded-full bg-lime-soft text-pill-ink text-center text-xs font-bold">
                {maxHours} hours / month
              </div>

              <ul className="mt-6 space-y-3 text-xs sm:text-sm text-ink-soft">
                <li className="flex items-center gap-2 font-medium text-ink">
                  <span className="text-moss font-bold">✓</span>
                  <span>Everything in {proName}</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Courses up to {maxHours} hours monthly</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Highest priority building</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Offline sync & export</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Priority support</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-moss font-bold">✓</span>
                  <span>Early access to new features</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              <button
                onClick={() => (isUnlimitedFree ? (window.location.href = "/dashboard") : setCheckoutModal("MAX"))}
                className="w-full h-12 rounded-full border border-transparent bg-transparent text-foreground shadow-[inset_0_0_0_1px_var(--line)] hover:bg-muted font-medium text-[0.92rem] transition-colors cursor-pointer"
              >
                {isUnlimitedFree ? "Included in Free Mode" : `Get ${maxName}`}
              </button>
            </div>
          </li>
        </ul>

        {/* Trust Badges matching Screenshot 2 */}
        <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-ink-soft">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="text-moss">✓</span> Existing courses are always free
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="text-moss">✓</span> Extra hours don&apos;t expire for 30 days
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="text-moss">✓</span> Cancel any time
          </span>
        </div>

        {/* Powered by / VAT note */}
        <div className="mt-4 text-center text-[0.72rem] text-ink-soft/70">
          <p>Enjoy spring promotional prices. Prices are in USD and exclude local VAT where applicable. · 🔒 Powered by Dodo Payments</p>
        </div>

        {/* Questions Section matching Screenshot 2 */}
        <section className="mt-20 max-w-2xl mx-auto space-y-8">
          <h2 className="text-xl font-display font-bold text-ink">
            Questions
          </h2>

          <div className="space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="space-y-1">
                <h3 className="text-xs sm:text-sm font-bold text-ink">
                  {faq.q}
                </h3>
                <p className="text-xs sm:text-sm text-ink-soft leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Checkout Modal */}
      {checkoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-3xl border border-line p-6 sm:p-8 max-w-md w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-lime-soft text-moss mx-auto flex items-center justify-center font-bold text-xl mb-4">
              ✓
            </div>
            <h3 className="text-xl font-display font-bold text-ink">
              Upgrade to {checkoutModal} Plan
            </h3>
            <p className="text-xs sm:text-sm text-ink-soft mt-2">
              Instant activation via Dodo Payments sandbox. Your video hour quota will be credited immediately.
            </p>

            {successMessage ? (
              <div className="mt-5 p-3 rounded-xl bg-lime-soft text-moss text-sm font-semibold">
                {successMessage}
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-2.5">
                <button
                  onClick={() => handleSubscribe(checkoutModal)}
                  disabled={processing}
                  className="w-full py-2.5 rounded-full bg-primary text-primary-foreground hover:bg-moss-dark text-sm font-semibold transition-transform hover:-translate-y-0.5 disabled:opacity-50"
                >
                  {processing ? "Confirming..." : "Confirm Subscription"}
                </button>
                <button
                  onClick={() => setCheckoutModal(null)}
                  disabled={processing}
                  className="w-full py-2.5 rounded-full border border-line text-ink-soft text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <CourseItFooter />
    </div>
  );
}
