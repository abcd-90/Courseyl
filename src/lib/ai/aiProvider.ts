import { prisma } from "@/lib/db";

export type NormalizedAIProvider = "NVIDIA_NEMOTRON" | "OPENAI" | "LOCAL";

export const DEFAULT_NEMOTRON_MODEL = "nvidia/llama-3.1-nemotron-70b-instruct";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

export interface ResolvedAIProviderConfig {
  activeProvider: NormalizedAIProvider;
  rawProviderSetting: string;
  activeModel: string;
  hasNvidiaKey: boolean;
  hasOpenAiKey: boolean;
  hasYouTubeKey: boolean;
  source: "database" | "env" | "default";
}

export interface AIProvider {
  name: string;
  model?: string;
  generateCompletion(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, schemaDescription: string): Promise<T>;
}

export function normalizeAIProviderName(raw?: string | null): NormalizedAIProvider | null {
  if (!raw || typeof raw !== "string") return null;
  const v = raw.trim().toUpperCase();
  if (!v) return null;
  if (v === "LOCAL" || v === "HEURISTIC_MOCK" || v === "DETERMINISTIC") {
    return "LOCAL";
  }
  if (v.includes("OPENAI") || v.includes("GPT")) {
    return "OPENAI";
  }
  if (v.includes("NEMOTRON") || v === "NVIDIA") {
    return "NVIDIA_NEMOTRON";
  }
  return null;
}

function parseAIJson<T>(rawText: string): T {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objStart = cleaned.indexOf("{");
    const objEnd = cleaned.lastIndexOf("}");
    if (objStart !== -1 && objEnd > objStart) {
      return JSON.parse(cleaned.slice(objStart, objEnd + 1)) as T;
    }
    const arrStart = cleaned.indexOf("[");
    const arrEnd = cleaned.lastIndexOf("]");
    if (arrStart !== -1 && arrEnd > arrStart) {
      return JSON.parse(cleaned.slice(arrStart, arrEnd + 1)) as T;
    }
    throw new Error("AI response did not contain valid JSON.");
  }
}

function resolveModelForProvider(
  provider: NormalizedAIProvider,
  explicitModel?: string | null
): string {
  const trimmed = explicitModel?.trim();
  if (provider === "NVIDIA_NEMOTRON") {
    if (trimmed && !trimmed.toLowerCase().startsWith("gpt-")) {
      return trimmed;
    }
    return process.env.NVIDIA_MODEL?.trim() || DEFAULT_NEMOTRON_MODEL;
  }
  if (provider === "OPENAI") {
    if (trimmed && !trimmed.toLowerCase().includes("nemotron")) {
      return trimmed;
    }
    return process.env.OPENAI_MODEL?.trim() || DEFAULT_OPENAI_MODEL;
  }
  return "deterministic-v2";
}

export class NemotronAIProvider implements AIProvider {
  name = "NVIDIA Nemotron";
  model: string;
  private apiKey: string;
  private baseUrl: string;

  constructor(modelOverride?: string) {
    this.apiKey = (process.env.NVIDIA_API_KEY || "").trim();
    this.baseUrl = (process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1").replace(/\/+$/, "");
    this.model = resolveModelForProvider("NVIDIA_NEMOTRON", modelOverride);
  }

  async generateCompletion(
    prompt: string,
    systemPrompt = "You are an expert curriculum designer and senior software engineer."
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("NVIDIA_API_KEY is not configured.");
    }

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.25,
        max_tokens: 3500,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NVIDIA Nemotron API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("NVIDIA Nemotron returned empty completion content.");
    }
    return content;
  }

  async generateJSON<T>(prompt: string, schemaDescription: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON conforming to the following structure:\n${schemaDescription}\nDo not wrap in markdown or backticks.`;
    const response = await this.generateCompletion(fullPrompt);
    return parseAIJson<T>(response);
  }
}

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  model: string;
  private apiKey: string;

  constructor(modelOverride?: string) {
    this.apiKey = (process.env.OPENAI_API_KEY || "").trim();
    this.model = resolveModelForProvider("OPENAI", modelOverride);
  }

  async generateCompletion(
    prompt: string,
    systemPrompt = "You are an expert educational curriculum designer."
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("OPENAI_API_KEY is not configured.");
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.25,
        max_tokens: 3500,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText.slice(0, 300)}`);
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
      throw new Error("OpenAI returned empty completion content.");
    }
    return content;
  }

  async generateJSON<T>(prompt: string, schemaDescription: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond strictly with valid JSON conforming to:\n${schemaDescription}\nDo not wrap in markdown.`;
    const response = await this.generateCompletion(fullPrompt);
    return parseAIJson<T>(response);
  }
}

export class LocalDeterministicProvider implements AIProvider {
  name = "Local Deterministic Synthesizer";
  model = "deterministic-v2";

  async generateCompletion(prompt: string): Promise<string> {
    return `Synthesized content based on prompt: ${prompt.slice(0, 100)}...`;
  }

  async generateJSON<T>(prompt: string): Promise<T> {
    throw new Error(
      `Direct generateJSON not implemented in base LocalDeterministicProvider; use domain synthesizer for prompt: ${prompt.slice(0, 50)}`
    );
  }
}

export function isExternalAIProvider(provider: AIProvider): boolean {
  return provider instanceof NemotronAIProvider || provider instanceof OpenAIProvider;
}

function buildProviderFromPreference(
  preferred: NormalizedAIProvider,
  explicitModel?: string | null
): AIProvider {
  const hasNvidiaKey = Boolean(process.env.NVIDIA_API_KEY?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (preferred === "LOCAL") {
    return new LocalDeterministicProvider();
  }

  if (preferred === "NVIDIA_NEMOTRON") {
    if (hasNvidiaKey) {
      return new NemotronAIProvider(explicitModel || undefined);
    }
    if (hasOpenAiKey) {
      return new OpenAIProvider(explicitModel || undefined);
    }
    return new LocalDeterministicProvider();
  }

  if (preferred === "OPENAI") {
    if (hasOpenAiKey) {
      return new OpenAIProvider(explicitModel || undefined);
    }
    if (hasNvidiaKey) {
      return new NemotronAIProvider(explicitModel || undefined);
    }
    return new LocalDeterministicProvider();
  }

  return new LocalDeterministicProvider();
}

export function getSecondaryAIProvider(primary: AIProvider): AIProvider | null {
  const hasNvidiaKey = Boolean(process.env.NVIDIA_API_KEY?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (primary instanceof NemotronAIProvider && hasOpenAiKey) {
    return new OpenAIProvider();
  }
  if (primary instanceof OpenAIProvider && hasNvidiaKey) {
    return new NemotronAIProvider();
  }
  return null;
}

/**
 * Single source of truth for active AI provider & model configuration across Admin Studio and generators.
 * Precedence: PlatformSetting (DB) -> Environment (`AI_PROVIDER`) -> Default (`NVIDIA_NEMOTRON`).
 */
export async function resolveAIProviderConfig(): Promise<ResolvedAIProviderConfig> {
  const hasNvidiaKey = Boolean(process.env.NVIDIA_API_KEY?.trim());
  const hasOpenAiKey = Boolean(process.env.OPENAI_API_KEY?.trim());
  const hasYouTubeKey = Boolean(process.env.YOUTUBE_API_KEY?.trim());

  let dbProvider: string | null = null;
  let dbModel: string | null = null;

  try {
    const settings = await prisma.platformSetting.findMany({
      where: { key: { in: ["AI_PROVIDER", "AI_MODEL"] } },
      select: { key: true, value: true },
    });
    for (const s of settings) {
      if (s.key === "AI_PROVIDER") dbProvider = s.value;
      if (s.key === "AI_MODEL") dbModel = s.value;
    }
  } catch {
    // Database unreachable or non-DB test context; fall back to env precedence cleanly
  }

  const normalizedDb = normalizeAIProviderName(dbProvider);
  const normalizedEnv = normalizeAIProviderName(process.env.AI_PROVIDER);

  let source: ResolvedAIProviderConfig["source"] = "default";
  let preferred: NormalizedAIProvider = "NVIDIA_NEMOTRON";

  if (normalizedDb) {
    preferred = normalizedDb;
    source = "database";
  } else if (normalizedEnv) {
    preferred = normalizedEnv;
    source = "env";
  }

  let effective: NormalizedAIProvider = preferred;
  if (preferred === "NVIDIA_NEMOTRON" && !hasNvidiaKey) {
    effective = hasOpenAiKey ? "OPENAI" : "LOCAL";
  } else if (preferred === "OPENAI" && !hasOpenAiKey) {
    effective = hasNvidiaKey ? "NVIDIA_NEMOTRON" : "LOCAL";
  }

  return {
    activeProvider: effective,
    rawProviderSetting: dbProvider || process.env.AI_PROVIDER || preferred,
    activeModel: resolveModelForProvider(effective, dbModel),
    hasNvidiaKey,
    hasOpenAiKey,
    hasYouTubeKey,
    source,
  };
}

/**
 * Resolves the active AIProvider using DB PlatformSetting -> env -> NVIDIA_NEMOTRON/OpenAI precedence.
 */
export async function resolveAIProvider(): Promise<AIProvider> {
  const config = await resolveAIProviderConfig();
  return buildProviderFromPreference(config.activeProvider, config.activeModel);
}

/**
 * Synchronous env-based AIProvider resolution kept for lightweight or non-async callers.
 * Aligns default precedence with Admin Studio (`NVIDIA_NEMOTRON` -> `OPENAI` -> `LOCAL`).
 */
export function getAIProvider(override?: { provider?: string; model?: string }): AIProvider {
  const normalizedOverride = normalizeAIProviderName(override?.provider);
  const normalizedEnv = normalizeAIProviderName(process.env.AI_PROVIDER);
  const preferred: NormalizedAIProvider = normalizedOverride || normalizedEnv || "NVIDIA_NEMOTRON";

  return buildProviderFromPreference(preferred, override?.model);
}
