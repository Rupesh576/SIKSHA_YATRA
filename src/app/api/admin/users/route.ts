import { NextResponse, type NextRequest } from "next/server";
import { getPool } from "@/lib/db";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";

export const runtime = "nodejs";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { user: null, isAdmin: false } as const;
  return { user, isAdmin: user.isAdmin } as const;
}

export async function GET() {
  const { user, isAdmin } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const result = await getPool().query(
    `select id, email, name, first_name, surname, phone_number, classes, subjects, is_blocked, blocked_reason, created_at, last_login_at
     from siksha_yatra.users order by created_at desc`,
  );

  const users = result.rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    firstName: row.first_name ?? "",
    surname: row.surname ?? "",
    email: row.email,
    phoneNumber: row.phone_number ?? "",
    classes: row.classes ?? [],
    subjects: row.subjects ?? [],
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at,
    blocked: row.is_blocked,
    blockedReason: row.blocked_reason ?? "",
  }));

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, isAdmin } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  let body: { id?: unknown; blocked?: unknown; reason?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id) || typeof body.blocked !== "boolean") {
    return NextResponse.json({ error: "A valid user ID and blocked status are required." }, { status: 400 });
  }
  if (body.id === user.id) {
    return NextResponse.json({ error: "You cannot block your own admin account." }, { status: 400 });
  }
  const reason = typeof body.reason === "string" ? body.reason.trim() : "";
  if (body.blocked && (reason.length < 3 || reason.length > 500)) {
    return NextResponse.json({ error: "Enter a block reason between 3 and 500 characters." }, { status: 400 });
  }

  const pool = getPool();
  const targetResult = await pool.query(`select email, is_admin from siksha_yatra.users where id = $1`, [body.id]);
  if (targetResult.rows.length === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (targetResult.rows[0].is_admin || isAdminEmail(targetResult.rows[0].email)) {
    return NextResponse.json({ error: "Admin accounts cannot be blocked from this dashboard." }, { status: 400 });
  }

  await pool.query(
    `update siksha_yatra.users set is_blocked = $1, blocked_reason = $2, updated_at = now() where id = $3`,
    [body.blocked, body.blocked ? reason : null, body.id],
  );
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, isAdmin } = await requireAdmin();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  let body: { id?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  if (typeof body.id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.id)) {
    return NextResponse.json({ error: "A valid user ID is required." }, { status: 400 });
  }
  if (body.id === user.id) {
    return NextResponse.json({ error: "You cannot remove your own admin account." }, { status: 400 });
  }

  const pool = getPool();
  const targetResult = await pool.query(`select email, is_admin from siksha_yatra.users where id = $1`, [body.id]);
  if (targetResult.rows.length === 0) {
    return NextResponse.json({ error: "User not found." }, { status: 404 });
  }
  if (targetResult.rows[0].is_admin || isAdminEmail(targetResult.rows[0].email)) {
    return NextResponse.json({ error: "Admin accounts cannot be removed from this dashboard." }, { status: 400 });
  }

  await pool.query(`delete from siksha_yatra.users where id = $1`, [body.id]);
  return NextResponse.json({ success: true });
}
