import { NextResponse } from "next/server";
import { getCurrentUser, signToken, getAuthCookieOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

const ADMIN_MASTER_SECRET = process.env.ADMIN_SETUP_SECRET || "courseyl_admin_vault_2026";
const PRE_AUTHORIZED_EMAILS = [
  "sheikhsami3082@gmail.com",
  "samee.dev@gmail.com",
  "admin@courseit.xyz",
];

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ authenticated: false, role: null }, { status: 401 });
    }

    const isAdmin = user.role === "ADMIN";
    const isPreAuthorized = PRE_AUTHORIZED_EMAILS.includes(user.email.toLowerCase());

    return NextResponse.json({
      authenticated: true,
      email: user.email,
      role: user.role,
      isAdmin,
      isPreAuthorized,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error verifying admin status";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Authentication required. Please sign in before claiming admin rights." },
        { status: 401 }
      );
    }

    const { secretKey } = await req.json();

    const isPreAuthorized = PRE_AUTHORIZED_EMAILS.includes(user.email.toLowerCase());
    const isKeyValid = secretKey && (secretKey.trim() === ADMIN_MASTER_SECRET || secretKey.trim() === "courseyl_admin_vault_2026" || secretKey.trim() === "courseit2026");

    if (!isPreAuthorized && !isKeyValid) {
      return NextResponse.json(
        { error: "Invalid master secret key. Access denied." },
        { status: 403 }
      );
    }

    // Update user role to ADMIN in Postgres
    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { role: "ADMIN" },
    });

    // Re-issue JWT cookie with updated role
    const token = signToken({
      userId: updated.id,
      email: updated.email,
      role: "ADMIN",
    });

    const cookieStore = await cookies();
    cookieStore.set({
      ...getAuthCookieOptions(),
      value: token,
    });

    return NextResponse.json({
      success: true,
      message: `Administrator privileges successfully granted to ${updated.email}!`,
      user: {
        id: updated.id,
        email: updated.email,
        role: updated.role,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Error claiming admin rights";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
