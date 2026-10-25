import { NextResponse, type NextRequest } from "next/server";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type ProfileRow = {
  id: string;
  name: string | null;
  first_name: string | null;
  surname: string | null;
  email: string;
  phone_number: string | null;
  classes: string[];
  subjects: string[];
  created_at: string;
  last_login_at: string;
  blocked_reason: string | null;
};

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  return origin === request.nextUrl.origin;
}

export async function GET() {
  const { user, isAdmin } = await getAuthenticatedAdmin();
  if (!user) return NextResponse.json({ error: "Sign in to continue." }, { status: 401 });
  if (!isAdmin) return NextResponse.json({ error: "Admin access is required." }, { status: 403 });

  const admin = createAdminClient();
  const [profileResult, authUserResult] = await Promise.all([
    (async () => {
      const profiles: ProfileRow[] = [];
      for (let from = 0; ; from += 1000) {
        const { data, error } = await admin
          .from("profiles")
          .select("id, name, first_name, surname, email, phone_number, classes, subjects, created_at, last_login_at, blocked_reason")
          .order("created_at", { ascending: false })
          .range(from, from + 999);
        if (error) return { profiles, error: `Could not load teacher profiles: ${error.message}` };
        profiles.push(...(data as ProfileRow[]));
        if (data.length < 1000) break;
      }
      return { profiles, error: null };
    })(),
    (async () => {
      const authUsers = [];
      for (let page = 1; ; page += 1) {
        const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
        if (error) return { authUsers, error: `Could not load account status: ${error.message}` };
        authUsers.push(...data.users);
        if (data.users.length < 1000) break;
      }
      return { authUsers, error: null };
    })(),
  ]);
  if (profileResult.error) return NextResponse.json({ error: profileResult.error }, { status: 500 });
  if (authUserResult.error) return NextResponse.json({ error: authUserResult.error }, { status: 500 });

  const profilesById = new Map(profileResult.profiles.map((profile) => [profile.id, profile]));
  const users = authUserResult.authUsers.map((authUser) => {
    const profile = profilesById.get(authUser.id);
    const metadataClasses: unknown = authUser.user_metadata?.classes;
    const metadataSubjects: unknown = authUser.user_metadata?.subjects;
    return {
      id: authUser.id,
      name: profile?.name ?? authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? "",
      firstName: profile?.first_name ?? authUser.user_metadata?.first_name ?? "",
      surname: profile?.surname ?? authUser.user_metadata?.surname ?? "",
      email: profile?.email ?? authUser.email ?? "",
      phoneNumber: profile?.phone_number ?? authUser.user_metadata?.phone_number ?? "",
      classes: profile?.classes ?? (Array.isArray(metadataClasses) ? metadataClasses.filter((item): item is string => typeof item === "string") : []),
      subjects: profile?.subjects ?? (Array.isArray(metadataSubjects) ? metadataSubjects.filter((item): item is string => typeof item === "string") : []),
      createdAt: profile?.created_at ?? authUser.created_at,
      lastLoginAt: profile?.last_login_at ?? authUser.last_sign_in_at ?? null,
      blocked: Boolean(authUser.banned_until && new Date(authUser.banned_until).getTime() > Date.now()),
      blockedReason: profile?.blocked_reason ?? "",
    };
  });

  return NextResponse.json({ users });
}

export async function PATCH(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, isAdmin } = await getAuthenticatedAdmin();
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

  const admin = createAdminClient();
  const { data: targetResult, error: targetError } = await admin.auth.admin.getUserById(body.id);
  if (targetError || !targetResult.user) {
    return NextResponse.json({ error: targetError?.message ?? "User not found." }, { status: 404 });
  }
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (targetResult.user.email && adminEmails.includes(targetResult.user.email.toLowerCase())) {
    return NextResponse.json({ error: "Admin accounts cannot be blocked from this dashboard." }, { status: 400 });
  }

  const { error: authError } = await admin.auth.admin.updateUserById(body.id, {
    ban_duration: body.blocked ? "876000h" : "none",
  });
  if (authError) return NextResponse.json({ error: `Could not update account access: ${authError.message}` }, { status: 500 });

  const { error: profileError } = await admin
    .from("profiles")
    .update({ is_blocked: body.blocked, blocked_reason: body.blocked ? reason : null, updated_at: new Date().toISOString() })
    .eq("id", body.id);
  if (profileError) {
    return NextResponse.json({ error: `Account access changed, but the profile status could not be updated: ${profileError.message}` }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  const { user, isAdmin } = await getAuthenticatedAdmin();
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

  const admin = createAdminClient();
  const { data: targetResult, error: targetError } = await admin.auth.admin.getUserById(body.id);
  if (targetError || !targetResult.user) {
    return NextResponse.json({ error: targetError?.message ?? "User not found." }, { status: 404 });
  }
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  if (targetResult.user.email && adminEmails.includes(targetResult.user.email.toLowerCase())) {
    return NextResponse.json({ error: "Admin accounts cannot be removed from this dashboard." }, { status: 400 });
  }

  const { error } = await admin.auth.admin.deleteUser(body.id);
  if (error) return NextResponse.json({ error: `Could not remove account: ${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true });
}
