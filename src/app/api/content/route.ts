import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.isBlocked) return NextResponse.json({ error: "This account is blocked." }, { status: 403 });
  return NextResponse.json({ title: "Teacher learning materials", url: process.env.GOOGLE_DRIVE_CONTENT_URL ?? "" });
}
