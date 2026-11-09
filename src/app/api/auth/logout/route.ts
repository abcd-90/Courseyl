import { NextResponse } from "next/server";
import { getAuthCookieOptions } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ success: true, message: "Logged out successfully" });
  const cookieOptions = getAuthCookieOptions();
  res.cookies.set(cookieOptions.name, "", {
    ...cookieOptions,
    maxAge: 0,
    expires: new Date(0),
  });
  return res;
}

