import React from "react";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { MarketingNavbar } from "@/components/MarketingNavbar";
import { CourseItFooter } from "@/components/CourseItFooter";
import { COURSE_CATEGORIES, classifyCourse } from "@/lib/courseCategories";
import { LibraryClient, CategoryGroup, SerializedCourse } from "./LibraryClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Free YouTube courses with notes and quizzes · Courseyl library",
  description:
    "Every public course on Courseyl, in one place: split into lessons with study notes, quizzes and a daily plan. Joining any of them is free. Videos play in YouTube's own player, so creators keep their views.",
  keywords: [
    "Course library",
    "free YouTube courses",
    "learn programming YouTube",
    "interactive YouTube courses",
    "free AI courses",
    "placement test courses",
    "Courseyl library",
  ],
  alternates: {
    canonical: "https://www.courseyl.online/library",
  },
  openGraph: {
    title: "Free YouTube courses with notes and quizzes · Courseyl library",
    description:
      "Every public course on Courseyl, in one place: split into lessons with study notes, quizzes and a daily plan. Joining any of them is free.",
    url: "https://www.courseyl.online/library",
    siteName: "Courseyl",
  },
  twitter: {
    card: "summary_large_image",
    title: "Free YouTube courses with notes and quizzes · Courseyl library",
    description:
      "Every public course on Courseyl, in one place: split into lessons with study notes, quizzes and a daily plan. Joining any of them is free.",
  },
};

export default async function LibraryPage() {
  const rawCourses = await prisma.course.findMany({
    where: {
      isPublic: true,
      status: "READY",
    },
    select: {
      id: true,
      slug: true,
      title: true,
      description: true,
      targetAudience: true,
      totalDurationSeconds: true,
      enrollmentCount: true,
      source: {
        select: {
          channelTitle: true,
        },
      },
      chapters: {
        select: {
          lessons: {
            select: { id: true },
          },
        },
      },
    },
    orderBy: [{ enrollmentCount: "desc" }, { createdAt: "desc" }],
  });

  const categorizedMap = new Map<string, SerializedCourse[]>();
  for (const cat of COURSE_CATEGORIES) {
    categorizedMap.set(cat.id, []);
  }

  for (const c of rawCourses) {
    const catId = classifyCourse(c.title, c.description, c.targetAudience);

    const lessonCount = c.chapters.reduce(
      (sum, ch) => sum + (ch.lessons?.length || 0),
      0
    );

    const courseItem: SerializedCourse = {
      id: c.id,
      slug: c.slug || c.id,
      title: c.title,
      description: c.description || "",
      totalDurationSeconds: c.totalDurationSeconds || 0,
      channelTitle: c.source?.channelTitle || null,
      lessonCount,
      enrollmentCount: c.enrollmentCount || 0,
      category: catId,
    };

    const targetList = categorizedMap.get(catId) || categorizedMap.get("other")!;
    targetList.push(courseItem);
  }

  const categoryGroups: CategoryGroup[] = COURSE_CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    courses: categorizedMap.get(cat.id) || [],
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Courseyl Course Library — Free Interactive Courses Built from YouTube",
    description:
      "Explore the complete Courseyl library of free courses created from YouTube tutorials. Structured lessons, diagnostic placement tests, timestamped quizzes, and synchronized study notes.",
    url: "https://www.courseyl.online/library",
    provider: {
      "@type": "Organization",
      name: "Courseyl",
      url: "https://www.courseyl.online",
      founder: {
        "@type": "Person",
        name: "Mr. Sami (Sheikh Sami)",
        jobTitle: "Founder & Lead Developer",
      },
    },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: rawCourses.length,
      itemListElement: rawCourses.slice(0, 30).map((c, idx) => ({
        "@type": "ListItem",
        position: idx + 1,
        item: {
          "@type": "Course",
          name: c.title,
          description: c.description || c.title,
          url: `https://www.courseyl.online/courses/${c.slug || c.id}`,
          provider: {
            "@type": "Organization",
            name: "Courseyl",
            sameAs: "https://www.courseyl.online",
          },
        },
      })),
    },
  };

  return (
    <div className="min-h-screen flex flex-col bg-paper text-ink transition-colors duration-300">
      <MarketingNavbar />

      {/* Schema.org JSON-LD Structured Data for Google & AI Search (GEO) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <main className="flex flex-1 flex-col">
        <article className="mx-auto flex w-full max-w-[880px] flex-col px-4 pt-36 pb-[110px] sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-lime-soft px-3.5 py-[7px] text-[0.78rem] font-medium text-pill-ink w-fit">
            Course library
          </span>

          <h1 className="mt-4 text-h1 font-medium leading-[1.08] text-ink">
            Free courses built from{" "}
            <em className="italic text-moss font-serif">YouTube.</em>
          </h1>

          <p className="mt-5 text-[1.05rem] leading-relaxed text-ink-soft">
            Every public course on Courseyl, in one place: {rawCourses.length} courses made from YouTube videos and playlists, each split into lessons with study notes, quizzes and a daily plan. Joining any of them is free. Videos play in YouTube&apos;s own player, so creators keep their views.
          </p>

          <LibraryClient
            categories={categoryGroups}
            totalCoursesCount={rawCourses.length}
          />
        </article>
      </main>

      <CourseItFooter />
    </div>
  );
}
