import { NextResponse, type NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { isAdminEmail, verifyPassword } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";

export const runtime = "nodejs";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SigninBody = {
  email?: unknown;
  password?: unknown;
};

export async function POST(request: NextRequest) {
  let body: SigninBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  if (!email || !password) {
    return NextResponse.json({ error: "Please enter your email and password." }, { status: 400 });
  }

  const pool = getPool();
  const result = await pool.query(
    `select id, password_hash, is_blocked, blocked_reason from siksha_yatra.users where lower(email) = $1`,
    [email],
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  const row = result.rows[0];
  const valid = await verifyPassword(password, row.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
  }
  if (row.is_blocked) {
    return NextResponse.json({ error: row.blocked_reason ? `This account is blocked: ${row.blocked_reason}` : "This account is blocked." }, { status: 403 });
  }

  await pool.query(`update siksha_yatra.users set last_login_at = now() where id = $1`, [row.id]);

  const token = await signSession({ sub: row.id, email, isAdmin: isAdminEmail(email) });
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
  return response;
}
