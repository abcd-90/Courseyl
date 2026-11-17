import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Refunds and Cancellation Policy — Courseyl",
  description:
    "How cancelling works, when you can get your money back, and how to ask. Clear, fair terms for Courseyl learners.",
  alternates: {
    canonical: "https://www.courseyl.online/refunds",
  },
};

export default function RefundsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink">
      <MarketingNavbar />

      <main className="flex-1 max-w-3xl mx-auto px-6 pt-36 pb-24 w-full">
        <span className="inline-block text-xs font-mono font-medium px-3 py-1 rounded-full bg-[#edf4d8] text-[#365314] dark:bg-[#1f2b1d] dark:text-[#a3b86c] mb-3">
          Last updated November 4, 2026
        </span>

        <h1 className="text-4xl sm:text-5xl font-display font-bold text-ink tracking-tight mt-1">
          Refunds and <em className="italic text-moss font-serif">cancellation.</em>
        </h1>

        <p className="mt-4 text-base text-ink-soft leading-relaxed">
          How cancelling works, when you can get your money back, and how to ask. Payments are handled securely through our merchant of record.
        </p>

        <div className="mt-10 space-y-8 divide-y divide-line/40 dark:divide-white/10">
          {/* 1. Cancelling */}
          <section className="space-y-3">
            <h2 className="text-xl font-display font-semibold text-ink">1. Cancelling</h2>
            <p className="text-ink-soft text-base leading-relaxed">
              You can cancel your plan at any time from{" "}
              <Link href="/settings" prefetch={true} className="text-moss underline font-medium hover:text-moss-dark">
                Settings &rarr; Manage billing
              </Link>
              . Cancelling stops the next renewal. You keep your plan until the end of the period you already paid for, and then it ends. Every course you built stays yours, and joining courses others built stays free.
            </p>
          </section>

          {/* 2. When we refund */}
          <section className="space-y-3 pt-8">
            <h2 className="text-xl font-display font-semibold text-ink">2. When we refund</h2>
            <p className="text-ink-soft text-base leading-relaxed">
              We give a full refund when:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-ink-soft text-base leading-relaxed">
              <li>
                you ask within 7 days of a charge (a new plan, a renewal or an upgrade) <strong>and</strong> you haven&apos;t built a new course since that charge;
              </li>
              <li>
                you were charged twice, or charged after you cancelled;
              </li>
              <li>
                Courseyl didn&apos;t work for you and we couldn&apos;t fix it.
              </li>
            </ul>
            <p className="text-ink-soft text-base leading-relaxed pt-1">
              Building a course is what costs us money, so once you&apos;ve built courses in a billing period we don&apos;t refund that period, and we don&apos;t give partial refunds for unused time after cancelling. If something feels unfair, email us anyway; we look at every request.
            </p>
          </section>

          {/* 3. How to ask */}
          <section className="space-y-3 pt-8">
            <h2 className="text-xl font-display font-semibold text-ink">3. How to ask</h2>
            <p className="text-ink-soft text-base leading-relaxed">
              Email{" "}
              <a href="mailto:thecourseyl@gmail.com" className="text-moss underline font-medium hover:text-moss-dark">
                thecourseyl@gmail.com
              </a>{" "}
              from the email you sign in with, with the date of the charge and a line on why. We reply within 3–5 working days.
            </p>
            <p className="text-ink-soft text-base leading-relaxed">
              Approved refunds go back to the card or payment method you paid with, through our payment processor. Your bank may take another 5–10 working days to show it. When a plan is refunded in full, it ends.
            </p>
          </section>

          {/* 4. Customers in the EU and UK */}
          <section className="space-y-3 pt-8">
            <h2 className="text-xl font-display font-semibold text-ink">4. Customers in the EU and UK</h2>
            <p className="text-ink-soft text-base leading-relaxed">
              You may have a legal right to cancel a new subscription within 14 days. If you build a course in that time, you ask us to start the service straight away, and a refund may be reduced for what you used. Nothing in this policy limits your rights under local consumer law.
            </p>
          </section>

          {/* 5. Taxes */}
          <section className="space-y-3 pt-8">
            <h2 className="text-xl font-display font-semibold text-ink">5. Taxes</h2>
            <p className="text-ink-soft text-base leading-relaxed">
              In India, prices are in rupees and include GST. In the UK, they are in pounds and include VAT. Everywhere else, prices are in US dollars and applicable sales tax or VAT is added at checkout. A refund includes the tax you paid.
            </p>
          </section>

          {/* 6. Contact */}
          <section className="space-y-3 pt-8">
            <h2 className="text-xl font-display font-semibold text-ink">6. Contact</h2>
            <p className="text-ink-soft text-base leading-relaxed">
              Questions? Email{" "}
              <a href="mailto:thecourseyl@gmail.com" className="text-moss underline font-medium hover:text-moss-dark">
                thecourseyl@gmail.com
              </a>
              . Courseyl is operated by Courseyl. See also our{" "}
              <Link href="/terms" prefetch={true} className="text-moss underline font-medium hover:text-moss-dark">
                Terms
              </Link>
              .
            </p>
          </section>
        </div>
      </main>

      <CourseItFooter />
    </div>
  );
}
