import React from "react";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function RefundsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
        <span className="text-xs font-bold uppercase tracking-wider text-moss">Legal</span>
        <h1 className="text-3xl sm:text-4xl font-display font-medium text-ink mt-2">
          Refund Policy
        </h1>
        <p className="text-xs text-ink-soft mt-2">Last updated: January 2026</p>

        <div className="mt-8 space-y-6 text-sm text-ink-soft leading-relaxed">
          <h2 className="text-xl font-display font-semibold text-ink">7-Day Money Back Guarantee</h2>
          <p>
            If you subscribe to a Pro or Max plan on Courseyl and are not satisfied with the platform within
            the first 7 days, you are eligible for a full, no-questions-asked refund.
          </p>

          <h2 className="text-xl font-display font-semibold text-ink pt-4">How to Request a Refund</h2>
          <p>
            You can cancel your active subscription directly from the Billing section in your dashboard, or contact
            our support team with your account email and payment reference.
          </p>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}
