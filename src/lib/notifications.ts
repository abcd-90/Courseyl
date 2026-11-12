import { prisma } from "@/lib/db";

export type NotificationType = "SYSTEM" | "COURSE" | "QUIZ" | "ROADMAP";

export async function createNotification(params: {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  linkUrl?: string | null;
}) {
  try {
    return await prisma.notification.create({
      data: {
        userId: params.userId,
        title: params.title,
        message: params.message,
        type: params.type || "SYSTEM",
        linkUrl: params.linkUrl ?? null,
      },
    });
  } catch (err) {
    console.warn("Non-fatal notification insert error:", err);
    return null;
  }
}

export async function ensureWelcomeNotification(userId: string) {
  try {
    const existingCount = await prisma.notification.count({
      where: { userId },
    });
    if (existingCount === 0) {
      await prisma.notification.create({
        data: {
          userId,
          title: "Welcome to Courseyl",
          message:
            "Paste any YouTube video or playlist to turn it into structured daily lessons, quizzes, and study notes.",
          type: "SYSTEM",
          linkUrl: "/generate",
          isRead: false,
        },
      });
    }
  } catch (err) {
    console.warn("Non-fatal welcome notification check error:", err);
  }
}

