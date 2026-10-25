import { createClient } from "@/lib/supabase/server";

export async function getAuthenticatedAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error) return { user: null, isAdmin: false };
  const allowedEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return {
    user,
    isAdmin: Boolean(user?.email && allowedEmails.includes(user.email.toLowerCase())),
  };
}
