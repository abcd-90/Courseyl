import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import {
  getAIProvider,
  isExternalAIProvider,
  normalizeAIProviderName,
  resolveAIProviderConfig,
} from "@/lib/ai/aiProvider";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const resolvedConfig = await resolveAIProviderConfig();

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
        activeProvider: resolvedConfig.activeProvider,
        activeModel: resolvedConfig.activeModel,
        rawProviderSetting: resolvedConfig.rawProviderSetting,
        precedenceSource: resolvedConfig.source,
        hasNvidiaKey: resolvedConfig.hasNvidiaKey,
        hasOpenAiKey: resolvedConfig.hasOpenAiKey,
        hasYouTubeKey: resolvedConfig.hasYouTubeKey,
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
      return NextResponse.json({ error: "Forbidden: Administrator role required." }, { status: 403 });
    }

    const body = await req.json();
    const { provider, model, test, prompt } = body;

    // Handle interactive test run using real aligned provider when configured
    if (test) {
      const normalized = normalizeAIProviderName(provider) || "NVIDIA_NEMOTRON";
      const instance = getAIProvider({
        provider: normalized,
        model: typeof model === "string" ? model : undefined,
      });

      if (!isExternalAIProvider(instance)) {
        return NextResponse.json({
          output: `[Diagnostic Fallback - Tier 2 Synthesizer Active]\nRequested Provider: ${provider || normalized}\nResolved Provider: ${instance.name}\nStatus: External API key not active for this provider or local mode selected.`,
        });
      }

      try {
        const testPrompt =
          typeof prompt === "string" && prompt.trim()
            ? prompt.trim()
            : "Explain in 2 concise sentences how checkpointed generation improves reliability.";
        const reply = await instance.generateCompletion(testPrompt);
        return NextResponse.json({
          output: `[Live AI Verification: 200 OK]\nProvider: ${instance.name}\nModel: ${instance.model || model || "Default"}\nResponse:\n${reply}`,
        });
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        return NextResponse.json({
          output: `[Live AI Request Failed - Tier 2 Fallback Ready]\nProvider: ${instance.name}\nModel: ${instance.model || model || "Default"}\nError: ${errMsg}`,
        });
      }
    }

    const savedProvider = normalizeAIProviderName(provider) || String(provider || "NVIDIA_NEMOTRON");

    await Promise.all([
      prisma.platformSetting.upsert({
        where: { key: "AI_PROVIDER" },
        update: { value: savedProvider },
        create: { key: "AI_PROVIDER", value: savedProvider },
      }),
      prisma.platformSetting.upsert({
        where: { key: "AI_MODEL" },
        update: { value: typeof model === "string" ? model.trim() : "" },
        create: { key: "AI_MODEL", value: typeof model === "string" ? model.trim() : "" },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `AI Provider updated to ${savedProvider} (${model || "default model"}).`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
