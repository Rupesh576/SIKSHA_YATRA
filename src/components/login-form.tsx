"use client";

import { useState } from "react";
import { ArrowRight, Lock, Mail, ShieldCheck } from "lucide-react";
import { createClient, describeAuthError, isSupabaseConfigured } from "@/lib/supabase/client";

const CLASS_OPTIONS = [
  "Nursery",
  "LKG",
  "UKG",
  ...Array.from({ length: 12 }, (_, index) => `Class ${index + 1}`),
];

const SUBJECT_OPTIONS = [
  "English",
  "Hindi",
  "Mathematics",
  "Science",
  "Social Science",
  "Computer Science",
  "Environmental Studies",
  "General Knowledge",
  "Art and Craft",
  "Physical Education",
  "Other",
];

const GOOGLE_PROFILE_DRAFT_KEY = "teacher-profile-draft";

type TeacherProfile = {
  firstName: string;
  surname: string;
  phoneNumber: string;
  classes: string[];
  subjects: string[];
};

type Mode = "signup" | "signin";

function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [mode, setMode] = useState<Mode>("signup");
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(initialError ?? "");
  const configured = isSupabaseConfigured();

  function getProfile(): TeacherProfile | null {
    const normalizedPhoneNumber = phoneNumber.trim();
    const digits = normalizedPhoneNumber.replace(/\D/g, "");
    if (!firstName.trim() || !surname.trim()) {
      setMessage("Please enter your first and last name.");
      return null;
    }
    if (!/^\+?[0-9\s().-]+$/.test(normalizedPhoneNumber) || digits.length < 7 || digits.length > 15) {
      setMessage("Please enter a valid phone number.");
      return null;
    }
    if (classes.length === 0 || subjects.length === 0) {
      setMessage("Please select at least one class and one subject.");
      return null;
    }
    return {
      firstName: firstName.trim(),
      surname: surname.trim(),
      phoneNumber: normalizedPhoneNumber,
      classes,
      subjects,
    };
  }

  async function signUp(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const profile = getProfile();
    if (!profile) return;
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setMessage("Your password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }
    if (!configured) {
      setMessage("Supabase is not configured yet. Add the values from .env.example to begin.");
      return;
    }

    setBusy(true);
    const fullName = `${profile.firstName} ${profile.surname}`;
    try {
      const { data, error } = await createClient().auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            first_name: profile.firstName,
            surname: profile.surname,
            full_name: fullName,
            phone_number: profile.phoneNumber,
            classes: profile.classes,
            subjects: profile.subjects,
          },
        },
      });
      if (error) {
        if (error.code === "user_already_exists") {
          setMessage("An account with this email already exists. Please sign in instead.");
          setMode("signin");
          return;
        }
        setMessage(describeAuthError(error, "Could not create your account."));
        return;
      }
      if (!data.session) {
        setMessage("Your account was created, but could not be signed in automatically. Please sign in below.");
        setMode("signin");
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setMessage(describeAuthError({ message: "Failed to fetch" }, "Could not create your account."));
    } finally {
      setBusy(false);
    }
  }

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!password) {
      setMessage("Please enter your password.");
      return;
    }
    if (!configured) {
      setMessage("Supabase is not configured yet. Add the values from .env.example to begin.");
      return;
    }

    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setMessage(describeAuthError(error, "Could not sign you in."));
        return;
      }
      window.location.assign("/dashboard");
    } catch {
      setMessage(describeAuthError({ message: "Failed to fetch" }, "Could not sign you in."));
    } finally {
      setBusy(false);
    }
  }

  async function googleLogin() {
    setMessage("");
    if (!configured) {
      setMessage("Supabase is not configured yet. Add the values from .env.example to begin.");
      return;
    }
    if (mode === "signup") {
      const profile = getProfile();
      if (!profile) return;
      sessionStorage.setItem(GOOGLE_PROFILE_DRAFT_KEY, JSON.stringify(profile));
    } else {
      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY);
    }

    setBusy(true);
    try {
      const { error } = await createClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });
      if (error) {
        sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY);
        setBusy(false);
        setMessage(describeAuthError(error, "Could not start Google sign-in."));
      }
    } catch {
      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY);
      setBusy(false);
      setMessage(describeAuthError({ message: "Failed to fetch" }, "Could not start Google sign-in."));
    }
  }

  return (
    <div className="mt-8 space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-mint/60 p-1">
        <button
          type="button"
          onClick={() => {
            setMode("signup");
            setMessage("");
          }}
          className={`h-10 rounded-xl text-sm font-semibold transition ${mode === "signup" ? "bg-white text-leaf shadow-sm" : "text-ink/55"}`}
        >
          Create account
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("signin");
            setMessage("");
          }}
          className={`h-10 rounded-xl text-sm font-semibold transition ${mode === "signin" ? "bg-white text-leaf shadow-sm" : "text-ink/55"}`}
        >
          Sign in
        </button>
      </div>

      {mode === "signup" && (
        <fieldset disabled={busy} className="space-y-4 disabled:opacity-70">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-2 text-sm font-semibold text-ink/75">
              First name
              <input
                autoComplete="given-name"
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                placeholder="First name"
                className="h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
              />
            </label>
            <label className="space-y-2 text-sm font-semibold text-ink/75">
              Surname
              <input
                autoComplete="family-name"
                required
                value={surname}
                onChange={(event) => setSurname(event.target.value)}
                placeholder="Surname"
                className="h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
              />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-semibold text-ink/75">
            Phone number
            <input
              autoComplete="tel"
              inputMode="tel"
              required
              type="tel"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="+91 98765 43210"
              className="h-12 w-full rounded-2xl border border-ink/10 bg-white px-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink/75">Which classes do you teach?</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CLASS_OPTIONS.map((className) => (
                <label
                  key={className}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink/75 has-[:checked]:border-leaf has-[:checked]:bg-mint"
                >
                  <input
                    type="checkbox"
                    checked={classes.includes(className)}
                    onChange={() => setClasses((current) => toggleSelection(current, className))}
                    className="accent-leaf"
                  />
                  {className}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-sm font-semibold text-ink/75">Which subjects do you teach?</legend>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECT_OPTIONS.map((subject) => (
                <label
                  key={subject}
                  className="flex cursor-pointer items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2 text-sm text-ink/75 has-[:checked]:border-leaf has-[:checked]:bg-mint"
                >
                  <input
                    type="checkbox"
                    checked={subjects.includes(subject)}
                    onChange={() => setSubjects((current) => toggleSelection(current, subject))}
                    className="accent-leaf"
                  />
                  {subject}
                </label>
              ))}
            </div>
          </fieldset>
        </fieldset>
      )}

      <button
        type="button"
        onClick={googleLogin}
        disabled={busy}
        className="flex h-14 w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-white font-semibold text-ink transition hover:border-leaf hover:bg-mint disabled:cursor-wait disabled:opacity-60"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-[#4285F4] text-sm font-bold text-white">G</span>
        Continue with Google
      </button>
      <div className="flex items-center gap-3 text-xs font-semibold uppercase tracking-widest text-ink/35">
        <span className="h-px flex-1 bg-ink/10" /> or <span className="h-px flex-1 bg-ink/10" />
      </div>

      <form onSubmit={mode === "signup" ? signUp : signIn} className="space-y-3">
        <label htmlFor="email" className="text-sm font-semibold text-ink/75">Email address</label>
        <div className="relative">
          <Mail className="absolute left-4 top-4 h-5 w-5 text-ink/35" />
          <input
            id="email"
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            disabled={busy}
            className="h-14 w-full rounded-2xl border border-ink/10 bg-white pl-12 pr-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10 disabled:bg-ink/5"
          />
        </div>

        <label htmlFor="password" className="text-sm font-semibold text-ink/75">Password</label>
        <div className="relative">
          <Lock className="absolute left-4 top-4 h-5 w-5 text-ink/35" />
          <input
            id="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 6 characters"
            disabled={busy}
            className="h-14 w-full rounded-2xl border border-ink/10 bg-white pl-12 pr-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10 disabled:bg-ink/5"
          />
        </div>

        {mode === "signup" && (
          <>
            <label htmlFor="confirmPassword" className="text-sm font-semibold text-ink/75">Confirm password</label>
            <div className="relative">
              <Lock className="absolute left-4 top-4 h-5 w-5 text-ink/35" />
              <input
                id="confirmPassword"
                autoComplete="new-password"
                type="password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter your password"
                disabled={busy}
                className="h-14 w-full rounded-2xl border border-ink/10 bg-white pl-12 pr-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10 disabled:bg-ink/5"
              />
            </div>
          </>
        )}

        <button
          disabled={busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-leaf font-bold text-white shadow-lg shadow-leaf/20 transition hover:-translate-y-0.5 hover:bg-[#185b41] disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Working…" : mode === "signup" ? "Create account" : "Sign in"}
          <ArrowRight className="h-5 w-5" />
        </button>
      </form>

      {message && (
        <div role="status" className="rounded-2xl bg-sun/20 p-4 text-sm leading-6 text-ink/75">
          {message}
        </div>
      )}
      <p className="flex items-start gap-2 pt-2 text-xs leading-5 text-ink/50">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
        Your account is protected with your own password. No email codes needed.
      </p>
    </div>
  );
}
