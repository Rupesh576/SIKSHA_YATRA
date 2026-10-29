import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const isBanned = Boolean(user?.banned_until && new Date(user.banned_until).getTime() > Date.now());

  if (error || !user || isBanned) {
    const status = isBanned ? 403 : 401;
    const deniedResponse = isApiRequest
      ? NextResponse.json({ error: isBanned ? "This account is blocked." : "Unauthorized" }, { status })
      : NextResponse.redirect(new URL("/", request.url));
    response.cookies.getAll().forEach(({ name, value, ...options }) => {
      deniedResponse.cookies.set(name, value, options);
    });
    return deniedResponse;
  }

  return response;
}

export const config = {
  matcher: ["/dashboard/:path*", "/admin/:path*", "/api/content/:path*", "/api/admin/:path*"],
};
