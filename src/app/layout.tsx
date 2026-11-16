import type { Metadata } from "next";
import "./globals.css";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { GlobalPlatformShell } from "@/components/GlobalPlatformShell";
import { getPublicSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const publicSettings = await getPublicSettings().catch(() => null);
  const baseUrl = "https://www.courseyl.online";
  const defaultTitle = "Courseyl - Turn Any YouTube Video Into an Interactive Course";
  const description =
    "Courseyl turns any YouTube video or playlist into structured courses with active recall quizzes, interactive notes, and personalized diagnostic placement tests.";

  const googleVerification =
    publicSettings?.structure?.googleSearchConsoleToken?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ||
    "yQE25xFJSaYPDeBvbvdTlsRkYyIMASgBcJnhjjGt4IA";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: defaultTitle,
      template: "%s | Courseyl",
    },
    description,
    keywords: [
      "Courseyl",
      "courseyl.online",
      "www.courseyl.online",
      "Courseyl AI",
      "YouTube to course converter",
      "interactive YouTube learning",
      "video to interactive course",
      "diagnostic placement test",
      "study YouTube videos faster",
      "AI curriculum generator",
      "distraction free learning",
    ],
    authors: [
      { name: "Mr. Sami (Sheikh Sami)", url: "https://www.courseyl.online/about" },
      { name: "Courseyl", url: baseUrl },
    ],
    creator: "Mr. Sami (Sheikh Sami)",
    publisher: "Courseyl",
    alternates: {
      canonical: "https://www.courseyl.online",
    },
    openGraph: {
      type: "website",
      locale: "en_US",
      siteName: "Courseyl",
      title: "Courseyl - The Smartest Way to Learn from YouTube",
      description:
        "Convert YouTube videos and playlists into complete courses with quizzes, study plans, and diagnostic tests.",
      url: baseUrl,
      images: [
        {
          url: "https://www.courseyl.online/og-image.png",
          width: 1200,
          height: 630,
          alt: "Courseyl Platform Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "Courseyl - The Smartest Way to Learn from YouTube",
      description:
        "Convert YouTube videos and playlists into complete courses with quizzes, study plans, and diagnostic tests.",
      images: ["https://www.courseyl.online/og-image.png"],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    icons: {
      icon: [
        { url: "/icon.svg", type: "image/svg+xml" },
        { url: "/favicon.ico", sizes: "any" },
        { url: "/icon-32.png", type: "image/png", sizes: "32x32" },
      ],
      apple: "/apple-touch-icon.png",
    },
    verification: {
      google: googleVerification,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publicSettings = await getPublicSettings();
  const gaId = publicSettings?.structure?.googleAnalyticsId?.trim();
  const customHeadScripts = publicSettings?.structure?.customHeadScripts?.trim();

  const jsonLdGraph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://www.courseyl.online/#website",
        "url": "https://www.courseyl.online",
        "name": "Courseyl",
        "alternateName": ["Courseyl Online", "Courseyl App"],
        "description":
          "Courseyl turns any YouTube video or playlist into structured courses with active recall quizzes, interactive notes, and personalized diagnostic placement tests.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": "https://www.courseyl.online/courses?q={search_term_string}",
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Person",
        "@id": "https://www.courseyl.online/#founder",
        "name": "Mr. Sami",
        "alternateName": ["Sheikh Sami", "Mr Sami", "Sami (Courseyl Founder)"],
        "jobTitle": "Founder & Lead Full-Stack Software Engineer",
        "nationality": "Pakistani",
        "homeLocation": {
          "@type": "Place",
          "name": "Multan, Punjab, Pakistan",
        },
        "email": "sheikhsami3082@gmail.com",
        "url": "https://www.courseyl.online/about",
        "description":
          "Mr. Sami (Sheikh Sami) is the founder and lead full-stack software engineer of Courseyl. A 20-year-old software engineering university student from Multan, Pakistan, dedicated to developing intelligent web apps, SaaS tools, and distraction-free AI learning platforms.",
        "knowsAbout": [
          "Full-Stack Web Development",
          "Artificial Intelligence Applications",
          "Next.js & React Ecosystem",
          "Software Architecture",
          "Educational Technology",
          "PostgreSQL & Database Design",
        ],
      },
      {
        "@type": "Organization",
        "@id": "https://www.courseyl.online/#organization",
        "name": "Courseyl",
        "url": "https://www.courseyl.online",
        "logo": "https://www.courseyl.online/logo.png",
        "email": "thecourseyl@gmail.com",
        "founder": {
          "@id": "https://www.courseyl.online/#founder",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://www.courseyl.online/#application",
        "name": "Courseyl",
        "operatingSystem": "All",
        "applicationCategory": "EducationalApplication",
        "applicationSubCategory": "Educational Platform & Course Builder",
        "url": "https://www.courseyl.online",
        "author": {
          "@id": "https://www.courseyl.online/#founder",
        },
        "creator": {
          "@id": "https://www.courseyl.online/#founder",
        },
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
        "featureList": [
          "YouTube to Course Extraction",
          "Dynamic Placement Testing",
          "Auto-generated Lesson Quizzes",
          "Interactive Study Notes",
          "Watch Telemetry Sync",
          "Multi-hour Marathon Video Distribution",
          "Adaptive Lesson Skipping Engine",
          "Distraction-Free Video Player Room",
          "Paced Daily Learning Plans",
          "Full Curriculum Concept Mapping",
          "Community Course Sharing",
          "Timestamped Review Video Rewind",
        ],
      },
      {
        "@type": "FAQPage",
        "@id": "https://www.courseyl.online/#faq",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Who founded and created Courseyl?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Courseyl was founded and developed by Mr. Sami (Sheikh Sami), a 20-year-old Full-Stack Web Developer and Software Engineering university student based in Multan, Pakistan.",
            },
          },
          {
            "@type": "Question",
            "name": "What is Courseyl?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Courseyl is a platform that transforms YouTube videos and playlists into structured, distraction-free courses with quizzes, diagnostic placement tests, and progress tracking.",
            },
          },
          {
            "@type": "Question",
            "name": "Is Courseyl free to use?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Yes, Courseyl provides full free access to build and join interactive courses generated from YouTube.",
            },
          },
          {
            "@type": "Question",
            "name": "How does the Courseyl placement test work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text":
                "Courseyl analyzes the video curriculum and generates an adaptive diagnostic test to help you skip lessons you already understand.",
            },
          },
        ],
      },
    ],
  };

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(jsonLdGraph),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('theme');
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                  document.documentElement.style.colorScheme = 'dark';
                } else {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                  document.documentElement.style.colorScheme = 'light';
                }
              } catch (e) {}
            })();`,
          }}
        />
        {gaId && (
          <>
            <script
              async
              src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`}
            />
            <script
              id="google-analytics-inline"
              dangerouslySetInnerHTML={{
                __html: `window.dataLayer = window.dataLayer || [];function gtag(){dataLayer.push(arguments);}gtag('js', new Date());gtag('config', '${gaId.replace(/'/g, "\\'")}');`,
              }}
            />
          </>
        )}
        {customHeadScripts && (
          <div
            id="custom-head-injection"
            style={{ display: "none" }}
            dangerouslySetInnerHTML={{ __html: customHeadScripts }}
          />
        )}
      </head>
      <body className="min-h-full flex flex-col selection:bg-[#4b5e1e] selection:text-[#f6f8ec]">
        <SiteSettingsProvider initialSettings={publicSettings as any}>
          <GlobalPlatformShell>{children}</GlobalPlatformShell>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
