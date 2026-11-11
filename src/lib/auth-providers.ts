import { prisma } from "./db";
import { supabaseAnonKey, supabaseUrl } from "./supabaseClient";

export const AUTH_SECRETS_KEY = "site_auth_secrets";

export interface ServerAuthSecretsConfig {
  resendApiKey: string;
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPass: string;
  smtpFrom: string;
}

export const DEFAULT_AUTH_SECRETS: ServerAuthSecretsConfig = {
  resendApiKey: "",
  smtpHost: "",
  smtpPort: 587,
  smtpUser: "",
  smtpPass: "",
  smtpFrom: "",
};

let supabaseSettingsCache: {
  data: Record<string, any> | null;
  fetchedAt: number;
} = { data: null, fetchedAt: 0 };

/**
 * Fetch public Supabase Auth settings to inspect which OAuth providers & email settings are enabled.
 */
export async function getSupabaseAuthSettings(): Promise<Record<string, any>> {
  const now = Date.now();
  if (
    supabaseSettingsCache.data &&
    now - supabaseSettingsCache.fetchedAt < 60_000
  ) {
    return supabaseSettingsCache.data;
  }

  try {
    const res = await fetch(`${supabaseUrl}/auth/v1/settings`, {
      headers: { apikey: supabaseAnonKey },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      supabaseSettingsCache = { data: json, fetchedAt: now };
      return json;
    }
  } catch {}
  return supabaseSettingsCache.data || { external: {} };
}

async function readDbAuthSecrets(): Promise<Partial<ServerAuthSecretsConfig>> {
  try {
    const row = await prisma.platformSetting.findUnique({
      where: { key: AUTH_SECRETS_KEY },
    });
    if (!row?.value) return {};
    return JSON.parse(row.value) as Partial<ServerAuthSecretsConfig>;
  } catch {
    return {};
  }
}

/**
 * Reads full OAuth & SMTP credentials merging `.env` with DB Admin secrets.
 * MUST ONLY BE CALLED ON THE SERVER — never serialize into public client settings.
 */
export async function getEffectiveAuthConfig(): Promise<
  ServerAuthSecretsConfig & { googleClientId: string; googleClientSecret: string }
> {
  const db = await readDbAuthSecrets();

  const pick = (envVal: string | undefined, dbVal: string | undefined) =>
    (dbVal && dbVal.trim()) || (envVal && envVal.trim()) || "";

  return {
    googleClientId: process.env.GOOGLE_CLIENT_ID?.trim() || "",
    googleClientSecret: process.env.GOOGLE_CLIENT_SECRET?.trim() || "",
    resendApiKey: pick(process.env.RESEND_API_KEY, db.resendApiKey),
    smtpHost: pick(process.env.SMTP_HOST, db.smtpHost),
    smtpPort: Number(db.smtpPort || process.env.SMTP_PORT || 587),
    smtpUser: pick(process.env.SMTP_USER, db.smtpUser),
    smtpPass: pick(process.env.SMTP_PASS, db.smtpPass),
    smtpFrom: pick(process.env.SMTP_FROM || process.env.SMTP_USER, db.smtpFrom),
  };
}

export async function saveAuthSecretsForAdmin(
  incoming: Partial<ServerAuthSecretsConfig>
) {
  const existing = await readDbAuthSecrets();
  const isMaskedOrBlank = (v: unknown) =>
    typeof v !== "string" || !v.trim() || v.includes("••••");

  const next: ServerAuthSecretsConfig = {
    resendApiKey: isMaskedOrBlank(incoming.resendApiKey)
      ? existing.resendApiKey || ""
      : String(incoming.resendApiKey).trim(),
    smtpHost:
      typeof incoming.smtpHost === "string"
        ? incoming.smtpHost.trim()
        : existing.smtpHost || "",
    smtpPort: Number(incoming.smtpPort || existing.smtpPort || 587),
    smtpUser:
      typeof incoming.smtpUser === "string"
        ? incoming.smtpUser.trim()
        : existing.smtpUser || "",
    smtpPass: isMaskedOrBlank(incoming.smtpPass)
      ? existing.smtpPass || ""
      : String(incoming.smtpPass).trim(),
    smtpFrom:
      typeof incoming.smtpFrom === "string"
        ? incoming.smtpFrom.trim()
        : existing.smtpFrom || "",
  };

  return prisma.platformSetting.upsert({
    where: { key: AUTH_SECRETS_KEY },
    update: { value: JSON.stringify(next) },
    create: { key: AUTH_SECRETS_KEY, value: JSON.stringify(next) },
  });
}

export async function getMaskedAuthSecretsForAdmin() {
  const cfg = await getEffectiveAuthConfig();
  return {
    googleConfigured: Boolean(cfg.googleClientId && cfg.googleClientSecret),
    hasResendKey: Boolean(cfg.resendApiKey),
    smtpHost: cfg.smtpHost,
    smtpPort: cfg.smtpPort,
    smtpUser: cfg.smtpUser,
    smtpHasPass: Boolean(cfg.smtpPass),
    smtpFrom: cfg.smtpFrom,
  };
}

/**
 * Non-secret provider readiness status exposed to login UI and security overview.
 */
export async function getPublicAuthProvidersStatus() {
  const [cfg, sb] = await Promise.all([
    getEffectiveAuthConfig(),
    getSupabaseAuthSettings(),
  ]);

  const external = sb?.external || {};

  const googleDirect = Boolean(cfg.googleClientId && cfg.googleClientSecret);
  const googleSupabase = Boolean(external.google);

  const hasCustomMailer = Boolean(
    cfg.resendApiKey || (cfg.smtpHost && cfg.smtpUser && cfg.smtpPass)
  );

  return {
    google: {
      enabled: googleDirect || googleSupabase,
      mode: googleDirect ? "direct" : googleSupabase ? "supabase" : "unconfigured",
    },
    email: {
      enabled: true,
      mode: hasCustomMailer ? "custom" : "supabase",
      requireVerification: true,
    },
  } as const;
}

