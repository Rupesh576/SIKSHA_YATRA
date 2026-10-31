import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { getPool } from "@/lib/db";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

export type AppUser = {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  surname: string | null;
  phoneNumber: string | null;
  classes: string[];
  subjects: string[];
  isBlocked: boolean;
  blockedReason: string | null;
  isAdmin: boolean;
  createdAt: string;
  lastLoginAt: string;
};

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function isAdminEmail(email: string) {
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
  return allowedEmails.includes(email.toLowerCase());
}

function mapUserRow(row: {
  id: string;
  email: string;
  name: string | null;
  first_name: string | null;
  surname: string | null;
  phone_number: string | null;
  classes: string[];
  subjects: string[];
  is_blocked: boolean;
  blocked_reason: string | null;
  is_admin: boolean;
  created_at: Date;
  last_login_at: Date;
}): AppUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    firstName: row.first_name,
    surname: row.surname,
    phoneNumber: row.phone_number,
    classes: row.classes,
    subjects: row.subjects,
    isBlocked: row.is_blocked,
    blockedReason: row.blocked_reason,
    isAdmin: row.is_admin || isAdminEmail(row.email),
    createdAt: row.created_at.toISOString(),
    lastLoginAt: row.last_login_at.toISOString(),
  };
}

export async function getUserById(id: string): Promise<AppUser | null> {
  const result = await getPool().query(
    `select id, email, name, first_name, surname, phone_number, classes, subjects, is_blocked, blocked_reason, is_admin, created_at, last_login_at
     from siksha_yatra.users where id = $1`,
    [id],
  );
  if (result.rows.length === 0) return null;
  return mapUserRow(result.rows[0]);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token);
  if (!session) return null;
  return getUserById(session.sub);
}
