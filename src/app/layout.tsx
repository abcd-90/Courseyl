import type { Metadata } from "next";
import "./globals.css";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { GlobalPlatformShell } from "@/components/GlobalPlatformShell";
import { getPublicSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const name = settings.branding.brandName || "Courseyl";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://courseyl.online";
  const title = `${name} — Turn YouTube into Interactive Courses with AI`;
  const description =
    settings.branding.tagline ||
    "Transform multi-hour YouTube videos and playlists into structured courses with bite-sized lessons, interactive notes, and placement tests.";

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: title,
      template: `%s | ${name}`,
    },
    description,
    keywords: [
      name,
      "courseyl",
      "courseyl.online",
      "Courseyl AI",
      "CourseIt",
      "courseit.xyz",
      "CourseIt alternative",
      "CourseIt vs Courseyl",
      "best CourseIt alternative",
      "YouTube to course",
      "AI course generator",
      "interactive learning",
      "video to courses",
      "study notes",
      "placement test",
    ],
    authors: [{ name: "Courseyl", url: baseUrl }],
    creator: name,
    publisher: name,
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title,
      description,
      url: baseUrl,
      siteName: name,
      locale: "en_US",
      type: "website",
      images: [
        {
          url: "/icon-512.png",
          width: 512,
          height: 512,
          alt: `${name} Logo`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/icon-512.png"],
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
      google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const publicSettings = await getPublicSettings();

  return (
    <html lang="en" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": "https://courseyl.online/#website",
                  "url": "https://courseyl.online",
                  "name": publicSettings.branding?.brandName || "Courseyl",
                  "alternateName": [
                    "Courseyl",
                    "Courseyl Online",
                    "Courseyl AI",
                    "CourseIt Alternative",
                    "Best CourseIt Alternative",
                  ],
                  "description":
                    publicSettings.branding?.tagline ||
                    "Transform multi-hour YouTube videos and playlists into structured courses with bite-sized lessons, interactive notes, and placement tests.",
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": "https://courseyl.online/courses?q={search_term_string}",
                    "query-input": "required name=search_term_string",
                  },
                },
                {
                  "@type": "Organization",
                  "@id": "https://courseyl.online/#organization",
                  "name": publicSettings.branding?.brandName || "Courseyl",
                  "url": "https://courseyl.online",
                  "logo": "https://courseyl.online/icon-512.png",
                  "email": "thecourseyl@gmail.com",
                },
              ],
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('theme');
                // Default to clean light mode matching CourseIt signature identity
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
      </head>
      <body className="min-h-full flex flex-col selection:bg-[#4b5e1e] selection:text-[#f6f8ec]">
        <SiteSettingsProvider initialSettings={publicSettings as any}>
          <GlobalPlatformShell>{children}</GlobalPlatformShell>
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
