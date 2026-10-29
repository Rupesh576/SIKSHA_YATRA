import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ArrowUpRight, BookOpen, LogOut, Mail, Sparkles, Users } from "lucide-react";
import { Brand } from "@/components/brand";
import { getCurrentUser, isAdminEmail } from "@/lib/auth";
import { SESSION_COOKIE } from "@/lib/session";

export default async function Dashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (user.isBlocked) redirect("/");

  async function logout() {
    "use server";
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
    redirect("/");
  }

  const name = user.name ?? "Teacher";
  const isAdmin = isAdminEmail(user.email);

  return (
    <main className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand />
        <div className="flex items-center gap-2">
          {isAdmin && (
            <a href="/admin" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-leaf hover:bg-white">
              <Users className="h-4 w-4" /> Manage users
            </a>
          )}
          <form action={logout}>
            <button className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-ink/60 hover:bg-white hover:text-ink">
              <LogOut className="h-4 w-4" /> Log out
            </button>
          </form>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-12">
        <div className="rounded-[2rem] bg-leaf p-8 text-white shadow-soft sm:p-12">
          <div className="flex items-center gap-2 text-sm font-semibold text-white/65">
            <Sparkles className="h-4 w-4" /> Your learning space
          </div>
          <h1 className="mt-5 font-display text-5xl leading-tight sm:text-6xl">Welcome, {name.split(" ")[0]}.</h1>
          <p className="mt-4 max-w-xl text-lg leading-8 text-white/75">Everything you need to prepare, teach and inspire is just one step away.</p>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
          <div className="rounded-[2rem] border border-ink/10 bg-white p-8 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-widest text-leaf">Shared library</p>
                <h2 className="mt-2 font-display text-3xl">Open your materials</h2>
              </div>
              <div className="rounded-2xl bg-mint p-3 text-leaf">
                <BookOpen />
              </div>
            </div>
            <p className="mt-4 max-w-lg leading-7 text-ink/60">Browse the shared Google Drive folder for lesson plans, classroom activities and teacher resources.</p>
            <a
              href={process.env.GOOGLE_DRIVE_CONTENT_URL || "#"}
              target="_blank"
              rel="noreferrer"
              className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-leaf px-6 py-4 font-bold text-white transition hover:bg-[#185b41]"
            >
              Open Learning Materials <ArrowUpRight className="h-5 w-5" />
            </a>
          </div>
          <div className="rounded-[2rem] border border-ink/10 bg-white p-8">
            <p className="text-sm font-bold uppercase tracking-widest text-leaf">Signed in as</p>
            <p className="mt-4 break-all font-semibold text-ink">{user.email}</p>
            <div className="mt-5 flex gap-2 text-sm text-ink/55">
              <Mail className="h-4 w-4" /> Verified account
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
