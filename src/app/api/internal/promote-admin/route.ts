import { NextResponse, type NextRequest } from "next/server";
import { getPool } from "@/lib/db";

export const runtime = "nodejs";

// Hidden admin-promotion endpoint. Requires ADMIN_PROMOTION_SECRET as a shared
// secret, not a signed-in session, so it works even before any admin exists.
// Returns 404 on any auth failure so the endpoint doesn't reveal itself to probing.
export async function POST(request: NextRequest) {
  const secret = process.env.ADMIN_PROMOTION_SECRET;
  let body: { email?: unknown; secret?: unknown; admin?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  if (!secret || typeof body.secret !== "string" || body.secret !== secret) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }
  const makeAdmin = body.admin !== false;

  const result = await getPool().query(
    `update siksha_yatra.users set is_admin = $1, updated_at = now() where lower(email) = $2 returning id, email`,
    [makeAdmin, email],
  );
  if (result.rows.length === 0) {
    return NextResponse.json({ error: "No account found with that email. They must sign up first." }, { status: 404 });
  }

  return NextResponse.json({ success: true, email: result.rows[0].email, admin: makeAdmin });
}
