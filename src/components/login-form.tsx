"use client";

import { useState } from "react";
import { ArrowRight, Mail, ShieldCheck } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";

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

function toggleSelection(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value];
}

export function LoginForm() {
  const [firstName, setFirstName] = useState("");
  const [surname, setSurname] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [classes, setClasses] = useState<string[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
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

  async function sendOtp(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    const profile = getProfile();
    if (!profile) return;
    if (!email || !email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }
    if (!configured) {
      setMessage("Supabase is not configured yet. Add the values from .env.example to begin.");
      return;
    }

    setBusy(true);
    const fullName = `${profile.firstName} ${profile.surname}`;
    const { error } = await createClient().auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
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
    setBusy(false);
    setSent(!error);
    setMessage(error ? error.message : "Your sign-in code is on its way. Check your inbox.");
  }

  async function verifyOtp(event: React.FormEvent) {
    event.preventDefault();
    setMessage("");
    if (code.length !== 6) {
      setMessage("Please enter the 6-digit code from your email.");
      return;
    }
    const profile = getProfile();
    if (!profile) return;

    setBusy(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: code,
      type: "email",
    });
    if (error) {
      setBusy(false);
      setMessage(error.message);
      return;
    }
    if (!data.user) {
      setBusy(false);
      setMessage("Your email was verified, but your account could not be loaded. Please try again.");
      return;
    }

    const fullName = `${profile.firstName} ${profile.surname}`;
    const { error: profileError } = await supabase.from("profiles").upsert({
      id: data.user.id,
      name: fullName,
      first_name: profile.firstName,
      surname: profile.surname,
      phone_number: profile.phoneNumber,
      classes: profile.classes,
      subjects: profile.subjects,
      email: email.trim().toLowerCase(),
      updated_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
    });
    setBusy(false);
    if (profileError) {
      setMessage(`Your email is verified, but your teacher profile could not be saved: ${profileError.message}`);
      return;
    }
    window.location.assign("/dashboard");
  }

  async function googleLogin() {
    setMessage("");
    const profile = getProfile();
    if (!profile) return;
    if (!configured) {
      setMessage("Supabase is not configured yet. Add the values from .env.example to begin.");
      return;
    }

    sessionStorage.setItem(GOOGLE_PROFILE_DRAFT_KEY, JSON.stringify(profile));
    setBusy(true);
    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY);
      setBusy(false);
      setMessage(error.message);
    }
  }

  return (
    <div className="mt-8 space-y-5">
      <fieldset disabled={sent || busy} className="space-y-4 disabled:opacity-70">
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

      <form onSubmit={sent ? verifyOtp : sendOtp} className="space-y-3">
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
            disabled={sent || busy}
            className="h-14 w-full rounded-2xl border border-ink/10 bg-white pl-12 pr-4 outline-none transition placeholder:text-ink/30 focus:border-leaf focus:ring-4 focus:ring-leaf/10 disabled:bg-ink/5"
          />
        </div>
        {sent && (
          <>
            <label htmlFor="code" className="text-sm font-semibold text-ink/75">6-digit code</label>
            <input
              id="code"
              autoComplete="one-time-code"
              inputMode="numeric"
              maxLength={6}
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))}
              placeholder="123456"
              className="h-14 w-full rounded-2xl border border-ink/10 bg-white px-4 text-center text-xl tracking-[.5em] outline-none focus:border-leaf focus:ring-4 focus:ring-leaf/10"
            />
          </>
        )}
        <button
          disabled={busy}
          className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-leaf font-bold text-white shadow-lg shadow-leaf/20 transition hover:-translate-y-0.5 hover:bg-[#185b41] disabled:cursor-wait disabled:opacity-60"
        >
          {busy ? "Working…" : sent ? "Verify and enter portal" : "Send secure sign-in code"}
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
        Your account is protected with secure authentication. No password to remember.
      </p>
    </div>
  );
}
