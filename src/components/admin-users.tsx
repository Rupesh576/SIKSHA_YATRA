"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, ShieldAlert, ShieldCheck, Trash2, UserRound } from "lucide-react";

type AdminUser = {
  id: string;
  name: string;
  firstName: string;
  surname: string;
  email: string;
  phoneNumber: string;
  classes: string[];
  subjects: string[];
  createdAt: string | null;
  lastLoginAt: string | null;
  blocked: boolean;
  blockedReason: string;
};

type UserResponse = { users: AdminUser[] };

function formatDate(value: string | null) {
  if (!value) return "Never";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString();
}

export function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "blocked">("all");
  const [loading, setLoading] = useState(true);
  const [busyUser, setBusyUser] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not load users.");
      setUsers((payload as UserResponse).users);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    return users.filter((user) => {
      if (status === "blocked" && !user.blocked) return false;
      if (status === "active" && user.blocked) return false;
      if (!query) return true;
      return [
        user.name,
        user.firstName,
        user.surname,
        user.email,
        user.phoneNumber,
        ...user.classes,
        ...user.subjects,
      ].some((field) => field.toLowerCase().includes(query));
    });
  }, [search, status, users]);

  async function updateBlocked(user: AdminUser) {
    const blocked = !user.blocked;
    const reason = (blocked ? window.prompt(`Why are you blocking ${user.email}?`)?.trim() : "") ?? "";
    if (blocked && !reason) return;
    if (blocked && reason.length < 3) {
      setMessage("Enter a block reason with at least 3 characters.");
      return;
    }
    const confirmation = blocked
      ? `Block ${user.email}? They will no longer be able to sign in.`
      : `Unblock ${user.email} and restore sign-in access?`;
    if (!window.confirm(confirmation)) return;

    setBusyUser(user.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, blocked, reason }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not update this account.");
      await loadUsers();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update this account.");
    } finally {
      setBusyUser(null);
    }
  }

  async function removeUser(user: AdminUser) {
    if (!window.confirm(`Permanently remove ${user.email}? This also deletes their profile and cannot be undone.`)) return;
    setBusyUser(user.id);
    setMessage("");
    try {
      const response = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "Could not remove this account.");
      setUsers((current) => current.filter((currentUser) => currentUser.id !== user.id));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove this account.");
    } finally {
      setBusyUser(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-ink/55">Registered users</p>
          <p className="mt-2 font-display text-3xl">{users.length}</p>
        </div>
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-sm text-ink/55">Blocked users</p>
          <p className="mt-2 font-display text-3xl text-red-700">{users.filter((user) => user.blocked).length}</p>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-3 rounded-2xl bg-white p-4 shadow-sm sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-ink/40" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search name, email, phone, class or subject"
            className="h-10 w-full rounded-xl border border-ink/10 pl-10 pr-3 text-sm outline-none focus:border-leaf"
          />
        </label>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as typeof status)}
          aria-label="Filter users by status"
          className="h-10 rounded-xl border border-ink/10 bg-white px-3 text-sm"
        >
          <option value="all">All users</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <button onClick={() => void loadUsers()} className="h-10 rounded-xl border border-ink/10 px-4 text-sm font-semibold hover:bg-mint">
          Refresh
        </button>
      </div>

      {message && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-sm text-red-800">{message}</p>}
      {loading ? (
        <p role="status" className="mt-8 rounded-2xl bg-white p-8 text-center text-ink/60">Loading user details…</p>
      ) : filteredUsers.length === 0 ? (
        <p className="mt-8 rounded-2xl bg-white p-8 text-center text-ink/60">No users match your search.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {filteredUsers.map((user) => (
            <article key={user.id} className="rounded-2xl border border-ink/10 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <UserRound className="h-5 w-5 text-leaf" />
                    <h2 className="font-semibold text-ink">{user.name || [user.firstName, user.surname].filter(Boolean).join(" ") || "Name not provided"}</h2>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${user.blocked ? "bg-red-100 text-red-800" : "bg-mint text-leaf"}`}>
                      {user.blocked ? "Blocked" : "Active"}
                    </span>
                  </div>
                  <div className="mt-3 grid gap-x-8 gap-y-2 text-sm text-ink/65 sm:grid-cols-2">
                    <p className="break-all"><strong className="text-ink/80">Email:</strong> {user.email || "—"}</p>
                    <p><strong className="text-ink/80">Phone:</strong> {user.phoneNumber || "—"}</p>
                    <p><strong className="text-ink/80">Registered:</strong> {formatDate(user.createdAt)}</p>
                    <p><strong className="text-ink/80">Last sign-in:</strong> {formatDate(user.lastLoginAt)}</p>
                  </div>
                  <p className="mt-3 text-sm text-ink/65"><strong className="text-ink/80">Classes:</strong> {user.classes.join(", ") || "—"}</p>
                  <p className="mt-1 text-sm text-ink/65"><strong className="text-ink/80">Subjects:</strong> {user.subjects.join(", ") || "—"}</p>
                  {user.blocked && user.blockedReason && (
                    <p className="mt-2 text-sm text-red-700"><strong>Block reason:</strong> {user.blockedReason}</p>
                  )}
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    disabled={busyUser === user.id}
                    onClick={() => void updateBlocked(user)}
                    className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-50 ${user.blocked ? "bg-mint text-leaf hover:bg-mint/70" : "bg-amber-50 text-amber-900 hover:bg-amber-100"}`}
                  >
                    {user.blocked ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                    {user.blocked ? "Unblock" : "Block"}
                  </button>
                  <button
                    disabled={busyUser === user.id}
                    onClick={() => void removeUser(user)}
                    className="inline-flex h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-sm font-semibold text-red-800 hover:bg-red-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" /> Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
