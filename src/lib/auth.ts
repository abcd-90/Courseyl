import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./db";
import { getPublicSettings } from "./settings";

const JWT_SECRET =
  process.env.JWT_SECRET || "courseit-default-secret-jwt-key-2026-production";
const COOKIE_NAME = "courseit_session";
const PENDING_VERIFY_COOKIE = "courseyl_pending_verify";

export interface SessionPayload {
  userId: string;
  email: string;
  role: string;
}

export interface PendingVerifyPayload {
  email: string;
  pollSecret: string;
  next: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: SessionPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as SessionPayload;
  } catch {
    return null;
  }
}

export function hashVerificationSecret(value: string): string {
  return crypto.createHmac("sha256", JWT_SECRET).update(value).digest("hex");
}

export function sanitizeNextPath(nextParam: string | null | undefined): string {
  if (!nextParam || typeof nextParam !== "string") return "/dashboard";
  const trimmed = nextParam.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return "/dashboard";
  return trimmed;
}

export function getRequestOrigin(req: Request): string {
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const proto =
    req.headers.get("x-forwarded-proto") ||
    (host.includes("localhost") || host.startsWith("127.0.0.1")
      ? "http"
      : "https");
  return `${proto}://${host}`;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser() {
  try {
    const session = await getSession();
    if (!session) return null;

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      include: {
        profile: true,
        subscription: true,
      },
    });

    return user;
  } catch (err) {
    console.error("[getCurrentUser] DB lookup error, returning null:", err);
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    name: COOKIE_NAME,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: "/",
  };
}

export interface UpsertVerifiedUserParams {
  email: string;
  provider: "email" | "google" | "github" | "x";
  providerId?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

/**
 * Find or create a verified user account for OAuth or verified email OTP login.
 * Never creates a session for unverified emails; honors allowNewSignups on first signup.
 */
export async function upsertVerifiedUser(params: UpsertVerifiedUserParams) {
  const cleanEmail = params.email.toLowerCase().trim();
  const fallbackName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
  const formattedFallback =
    fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1);
  const cleanName = (params.displayName || formattedFallback).trim();
  const cleanAvatar =
    params.avatarUrl ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
      cleanName
    )}&backgroundColor=b8c460`;

  let user = null;

  if (params.providerId) {
    user = await prisma.user.findFirst({
      where: {
        authProvider: params.provider,
        oauthProviderId: params.providerId,
      },
      include: { profile: true, subscription: true },
    });
  }

  if (!user) {
    user = await prisma.user.findUnique({
      where: { email: cleanEmail },
      include: { profile: true, subscription: true },
    });
  }

  if (!user) {
    const settings = await getPublicSettings().catch(() => null);
    if (settings && settings.plans.allowNewSignups === false) {
      throw new Error(
        "New registrations are temporarily paused by administrator."
      );
    }

    const randomHash = await hashPassword(
      crypto.randomBytes(24).toString("hex")
    );

    user = await prisma.user.create({
      data: {
        email: cleanEmail,
        passwordHash: randomHash,
        role: "USER",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        authProvider: params.provider,
        oauthProviderId: params.providerId || null,
        profile: {
          create: {
            displayName: cleanName,
            avatarUrl: cleanAvatar,
            dailyStudyMinutes: 60,
            currentStreakDays: 1,
            lastStudyDate: new Date(),
          },
        },
        subscription: {
          create: {
            tier: "FREE",
            status: "ACTIVE",
            monthlyGenerationsUsed: 0,
            monthlyHoursUsedSeconds: 0,
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        },
      },
      include: { profile: true, subscription: true },
    });
  } else {
    const needsVerificationUpdate =
      !user.emailVerified ||
      (params.providerId && !user.oauthProviderId);

    if (needsVerificationUpdate) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
          emailVerifiedAt: user.emailVerifiedAt || new Date(),
          authProvider:
            user.authProvider === "email" ? params.provider : user.authProvider,
          oauthProviderId: user.oauthProviderId || params.providerId || null,
        },
        include: { profile: true, subscription: true },
      });
    }

    if (params.avatarUrl && !user.profile?.avatarUrl) {
      await prisma.profile
        .upsert({
          where: { userId: user.id },
          update: { avatarUrl: params.avatarUrl },
          create: {
            userId: user.id,
            displayName: cleanName,
            avatarUrl: params.avatarUrl,
            dailyStudyMinutes: 60,
            currentStreakDays: 1,
            lastStudyDate: new Date(),
          },
        })
        .catch(() => {});
    }
  }

  return user;
}

export function attachSessionCookie(
  response: NextResponse,
  user: { id: string; email: string; role: string }
): NextResponse {
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
  });
  const cookieOpts = getAuthCookieOptions();
  response.cookies.set(cookieOpts.name, token, cookieOpts);
  return response;
}

export function attachPendingVerifyCookie(
  response: NextResponse,
  payload: PendingVerifyPayload
): NextResponse {
  const signed = jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
  response.cookies.set(PENDING_VERIFY_COOKIE, signed, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });
  return response;
}

export async function readPendingVerifyCookie(): Promise<PendingVerifyPayload | null> {
  try {
    const cookieStore = await cookies();
    const raw = cookieStore.get(PENDING_VERIFY_COOKIE)?.value;
    if (!raw) return null;
    const decoded = jwt.verify(raw, JWT_SECRET) as PendingVerifyPayload;
    if (!decoded?.email || !decoded?.pollSecret) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function clearPendingVerifyCookie(response: NextResponse): NextResponse {
  response.cookies.set(PENDING_VERIFY_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
  return response;
}
