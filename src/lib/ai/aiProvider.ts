export interface AIProvider {
  name: string;
  generateCompletion(prompt: string, systemPrompt?: string): Promise<string>;
  generateJSON<T>(prompt: string, schemaDescription: string): Promise<T>;
}

export class NemotronAIProvider implements AIProvider {
  name = "NVIDIA Nemotron";
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.NVIDIA_API_KEY || "";
    this.baseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    this.model = process.env.NVIDIA_MODEL || "nvidia/nemotron-4-340b-instruct";
  }

  async generateCompletion(prompt: string, systemPrompt = "You are an expert curriculum designer and senior software engineer."): Promise<string> {
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
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NVIDIA Nemotron API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async generateJSON<T>(prompt: string, schemaDescription: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond ONLY with valid JSON conforming to the following structure:\n${schemaDescription}\nDo not wrap in markdown or backticks.`;
    const response = await this.generateCompletion(fullPrompt);
    const cleaned = response.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as T;
  }
}

export class OpenAIProvider implements AIProvider {
  name = "OpenAI";
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || "";
    this.model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  }

  async generateCompletion(prompt: string, systemPrompt = "You are an expert educational curriculum designer."): Promise<string> {
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
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || "";
  }

  async generateJSON<T>(prompt: string, schemaDescription: string): Promise<T> {
    const fullPrompt = `${prompt}\n\nRespond strictly with valid JSON conforming to:\n${schemaDescription}\nDo not wrap in markdown.`;
    const response = await this.generateCompletion(fullPrompt);
    const cleaned = response.replace(/^```json\s*/, "").replace(/^```\s*/, "").replace(/```$/, "").trim();
    return JSON.parse(cleaned) as T;
  }
}

export class LocalDeterministicProvider implements AIProvider {
  name = "Local Deterministic Synthesizer";

  async generateCompletion(prompt: string): Promise<string> {
    return `Synthesized content based on prompt: ${prompt.slice(0, 100)}...`;
  }

  async generateJSON<T>(prompt: string): Promise<T> {
    throw new Error(`Direct generateJSON not implemented in base LocalDeterministicProvider; use domain synthesizer for prompt: ${prompt.slice(0, 50)}`);
  }
}

export function getAIProvider(): AIProvider {
  const providerType = (process.env.AI_PROVIDER || "local").toLowerCase();

  if (providerType === "nemotron" && process.env.NVIDIA_API_KEY) {
    return new NemotronAIProvider();
  }

  if (providerType === "openai" && process.env.OPENAI_API_KEY) {
    return new OpenAIProvider();
  }

  return new LocalDeterministicProvider();
}

