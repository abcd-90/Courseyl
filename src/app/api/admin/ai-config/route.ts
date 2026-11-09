import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check DB overrides first, then env defaults
    const [providerSetting, modelSetting] = await Promise.all([
      prisma.platformSetting.findUnique({ where: { key: "AI_PROVIDER" } }),
      prisma.platformSetting.findUnique({ where: { key: "AI_MODEL" } }),
    ]);

    const activeProvider = providerSetting?.value || process.env.AI_PROVIDER || "local";
    const activeModel = modelSetting?.value || (activeProvider === "nemotron" ? (process.env.NVIDIA_MODEL || "nvidia/nemotron-4-340b-instruct") : (process.env.OPENAI_MODEL || "gpt-4o-mini"));

    const recentJobs = await prisma.generationJob.findMany({
      take: 10,
      orderBy: { startedAt: "desc" },
      include: {
        course: { select: { title: true, slug: true } },
        user: { select: { email: true } },
      },
    });

    return NextResponse.json({
      config: {
        activeProvider,
        activeModel,
        hasNvidiaKey: !!process.env.NVIDIA_API_KEY,
        hasOpenAiKey: !!process.env.OPENAI_API_KEY,
        hasYouTubeKey: !!process.env.YOUTUBE_API_KEY,
      },
      recentJobs: recentJobs.map((j) => ({
        id: j.id,
        courseTitle: j.course.title,
        userEmail: j.user.email,
        status: j.status,
        progress: j.progressPercentage,
        currentStep: j.currentStep,
        errorLog: j.errorLog,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { provider, model } = await req.json();

    if (!["nemotron", "openai", "local"].includes(provider)) {
      return NextResponse.json({ error: "Invalid provider specified." }, { status: 400 });
    }

    await Promise.all([
      prisma.platformSetting.upsert({
        where: { key: "AI_PROVIDER" },
        update: { value: provider },
        create: { key: "AI_PROVIDER", value: provider },
      }),
      prisma.platformSetting.upsert({
        where: { key: "AI_MODEL" },
        update: { value: model || "" },
        create: { key: "AI_MODEL", value: model || "" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `AI Provider updated to ${provider} (${model || "default model"}).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

