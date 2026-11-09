import React from "react";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function RefundsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fcfcfa] text-[#0f1611]">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-36 pb-24">
        <span className="text-xs font-mono uppercase tracking-wider text-[#4c4c3d]">Last updated November 2026</span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-[#0f1611] tracking-tight mt-2">
          Refund <em className="italic text-[#4b5e1e] font-serif">policy.</em>
        </h1>

        <div className="mt-8 space-y-6 text-[#4c4c3d] text-base leading-relaxed">
          <p>
            We want you to be completely satisfied with CourseIt. If something isn&apos;t working as expected, we are
            here to help make it right.
          </p>

          <h2 className="text-xl font-display font-semibold text-[#0f1611] pt-4">30-Day Money Back Guarantee</h2>
          <p>
            Within 7 days of a charge, if you haven&apos;t built a new course on your plan, shoot us an email at{" "}
            <a href="mailto:hello@triggerfy.xyz" className="text-[#4b5e1e] underline">
              hello@triggerfy.xyz
            </a>{" "}
            and we will refund you in full.
          </p>

          <h2 className="text-xl font-display font-semibold text-[#0f1611] pt-4">Cancellations</h2>
          <p>
            You can cancel your subscription at any time with one click from Settings &gt; Manage billing. You keep your
            plan until the end of the current billing cycle, and any courses you built stay yours forever.
          </p>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}

