import React from "react";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-36 pb-24">
        <span className="text-xs font-mono uppercase tracking-wider text-ink-soft">Last updated November 2026</span>
        <h1 className="text-4xl sm:text-5xl font-display font-bold text-ink tracking-tight mt-2">
          Terms of <em className="italic text-moss font-serif">service.</em>
        </h1>

        <div className="mt-8 space-y-6 text-ink-soft text-base leading-relaxed">
          <p>
            By using Courseyl, you agree to these terms. If you do not agree, please do not use the service.
          </p>

          <h2 className="text-xl font-display font-semibold text-ink pt-4">1. Use of Service</h2>
          <p>
            Courseyl allows you to structure educational YouTube content for personal, non-commercial learning. You must
            abide by YouTube&apos;s terms of service and relevant content licenses.
          </p>

          <h2 className="text-xl font-display font-semibold text-ink pt-4">2. Accounts and Subscriptions</h2>
          <p>
            You are responsible for safeguarding your login credentials. Paid subscriptions renew automatically on a
            monthly or yearly cycle until canceled via Settings.
          </p>

          <h2 className="text-xl font-display font-semibold text-[#0f1611] pt-4">3. Fair Usage</h2>
          <p>
            Our AI pipelines transform transcripts into structured lessons and quizzes. Video quotas depend on your
            plan tier. We reserve the right to throttle abusive automated scraping.
          </p>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}

