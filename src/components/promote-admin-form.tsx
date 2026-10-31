"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";

export function PromoteAdminForm() {
  const [email, setEmail] = useState("");
  const [secret, setSecret] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    if (!email.trim() || !secret.trim()) {
      setMessage("Enter both an email address and the secret.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/internal/promote-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), secret: secret.trim(), admin: makeAdmin }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setMessage(payload.error ?? "Request failed. Check the secret and that the account exists.");
        return;
      }
      setSuccess(true);
      setMessage(makeAdmin ? `${payload.email} is now an admin.` : `${payload.email} is no longer an admin.`);
    } catch {
      setMessage("Could not reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft">
        <div className="flex items-center gap-2 text-leaf">
          <ShieldCheck className="h-5 w-5" />
          <h1 className="font-display text-2xl text-ink">Grant or revoke admin</h1>
        </div>
        <p className="mt-2 text-sm text-ink/55">The account must have already signed up. This page is not linked from anywhere in the app.</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <label className="block space-y-2 text-sm font-semibold text-ink/75">
            Account email
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teacher@example.com"
              disabled={busy}
              className="h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10 disabled:bg-ink/5"
            />
          </label>

          <label className="block space-y-2 text-sm font-semibold text-ink/75">
            Admin promotion secret
            <input
              type="password"
              required
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="Paste the secret"
              disabled={busy}
              className="h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10 disabled:bg-ink/5"
            />
          </label>

          <label className="flex items-center gap-2 text-sm font-semibold text-ink/75">
            <input
              type="checkbox"
              checked={makeAdmin}
              onChange={(event) => setMakeAdmin(event.target.checked)}
              disabled={busy}
              className="accent-leaf"
            />
            Grant admin access (uncheck to revoke instead)
          </label>

          <button
            disabled={busy}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-leaf font-bold text-white shadow-lg shadow-leaf/20 transition hover:-translate-y-0.5 hover:bg-[#185b41] disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? "Working…" : makeAdmin ? "Grant admin access" : "Revoke admin access"}
          </button>
        </form>

        {message && (
          <p role="status" className={`mt-4 rounded-2xl p-4 text-sm leading-6 ${success ? "bg-mint text-leaf" : "bg-sun/20 text-ink/75"}`}>
            {message}
          </p>
        )}
      </div>
    </main>
  );
}
