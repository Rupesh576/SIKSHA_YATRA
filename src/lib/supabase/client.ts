import { createBrowserClient } from "@supabase/ssr";

const PLACEHOLDER_URL = "https://your-project.supabase.co";
const PLACEHOLDER_KEY = "your-anon-or-publishable-key";

export function createClient() { return createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!); }

const NETWORK_ERROR_PATTERN = /failed to fetch|networkerror|load failed|fetch failed/i;

export function describeAuthError(error: { message: string } | null | undefined, fallback: string) {
  if (!error) return fallback;
  if (NETWORK_ERROR_PATTERN.test(error.message)) {
    return "Could not reach Supabase. Check your internet connection and confirm the Supabase URL and key in .env.local point to a real project.";
  }
  return error.message || fallback;
}

export function isSupabaseConfigured() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return false;
  if (url === PLACEHOLDER_URL || key === PLACEHOLDER_KEY) return false;
  try {
    new URL(url);
  } catch {
    return false;
  }
  return true;
}
