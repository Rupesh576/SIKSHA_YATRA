import { NextResponse, type NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { hashPassword, isAdminEmail } from "@/lib/auth";
import { SESSION_COOKIE, signSession } from "@/lib/session";

export const runtime = "nodejs";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

type SignupBody = {
  email?: unknown;
  password?: unknown;
  firstName?: unknown;
  surname?: unknown;
  phoneNumber?: unknown;
  classes?: unknown;
  subjects?: unknown;
};

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export async function POST(request: NextRequest) {
  let body: SignupBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const surname = typeof body.surname === "string" ? body.surname.trim() : "";
  const phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() : "";
  const classes = isStringArray(body.classes) ? body.classes : [];
  const subjects = isStringArray(body.subjects) ? body.subjects : [];

  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "Your password must be at least 6 characters." }, { status: 400 });
  }
  if (!firstName || !surname) {
    return NextResponse.json({ error: "Please enter your first and last name." }, { status: 400 });
  }
  if (classes.length === 0 || subjects.length === 0) {
    return NextResponse.json({ error: "Please select at least one class and one subject." }, { status: 400 });
  }

  const passwordHash = await hashPassword(password);
  const fullName = `${firstName} ${surname}`;

  const pool = getPool();
  let userId: string;
  try {
    const result = await pool.query(
      `insert into siksha_yatra.users (email, password_hash, name, first_name, surname, phone_number, classes, subjects)
       values ($1, $2, $3, $4, $5, $6, $7, $8)
       returning id`,
      [email, passwordHash, fullName, firstName, surname, phoneNumber, classes, subjects],
    );
    userId = result.rows[0].id;
  } catch (error) {
    if (error instanceof Error && "code" in error && (error as { code?: string }).code === "23505") {
      return NextResponse.json({ error: "An account with this email already exists. Please sign in instead." }, { status: 409 });
    }
    return NextResponse.json({ error: "Could not create your account." }, { status: 500 });
  }

  const token = await signSession({ sub: userId, email, isAdmin: isAdminEmail(email) });
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
