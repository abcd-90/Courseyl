import type { Metadata } from "next";
import "./globals.css";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import { getPublicSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicSettings();
  const name = settings.branding.brandName || "Courseyl";
  return {
    title: `${name} — Turn YouTube into Interactive Courses with AI`,
    description: settings.branding.tagline || "Transform multi-hour YouTube videos and playlists into structured courses with bite-sized lessons, interactive notes, and placement tests.",
    icons: {
      icon: "/favicon.ico",
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
          {children}
        </SiteSettingsProvider>
      </body>
    </html>
  );
}
