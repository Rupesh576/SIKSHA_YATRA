import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { AdminUsers } from "@/components/admin-users";
import { getAuthenticatedAdmin } from "@/lib/admin-auth";

export default async function AdminPage() {
  const { user, isAdmin } = await getAuthenticatedAdmin();
  if (!user) redirect("/");
  if (!isAdmin) redirect("/dashboard");

  return (
    <main className="min-h-screen bg-cream">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Brand />
        <p className="text-sm font-semibold text-ink/60">Admin: {user.email}</p>
      </header>
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-widest text-leaf">Operations</p>
        <h1 className="mt-2 font-display text-5xl">Teacher accounts</h1>
        <p className="mt-3 max-w-2xl leading-7 text-ink/60">
          Review registered teachers and their contact and teaching details. Blocking prevents sign-in; removing an account permanently deletes it.
        </p>
        <AdminUsers />
      </section>
    </main>
  );
}
