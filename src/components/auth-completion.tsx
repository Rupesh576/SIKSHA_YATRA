"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const GOOGLE_PROFILE_DRAFT_KEY = "teacher-profile-draft";

type TeacherProfile = {
  firstName: string;
  surname: string;
  phoneNumber: string;
  classes: string[];
  subjects: string[];
};

function isTeacherProfile(value: unknown): value is TeacherProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Record<string, unknown>;
  return (
    typeof profile.firstName === "string" &&
    typeof profile.surname === "string" &&
    typeof profile.phoneNumber === "string" &&
    Array.isArray(profile.classes) &&
    profile.classes.every((item) => typeof item === "string") &&
    Array.isArray(profile.subjects) &&
    profile.subjects.every((item) => typeof item === "string")
  );
}

export function AuthCompletion() {
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function completeSignIn() {
      const storedProfile = sessionStorage.getItem(GOOGLE_PROFILE_DRAFT_KEY);
      if (!storedProfile) {
        window.location.replace("/dashboard");
        return;
      }

      let profile: unknown;
      try {
        profile = JSON.parse(storedProfile);
      } catch {
        setMessage("Your teacher details could not be read. Please return and try signing in again.");
        return;
      }
      if (!isTeacherProfile(profile)) {
        setMessage("Your teacher details are incomplete. Please return and try signing in again.");
        return;
      }

      const supabase = createClient();
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError || !data.user) {
        setMessage(userError?.message ?? "Your account could not be loaded. Please try signing in again.");
        return;
      }
      if (!data.user.email) {
        setMessage("Your Google account did not provide an email address. Please use email sign-in instead.");
        return;
      }

      const fullName = `${profile.firstName} ${profile.surname}`;
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: profile.firstName,
          surname: profile.surname,
          full_name: fullName,
          phone_number: profile.phoneNumber,
          classes: profile.classes,
          subjects: profile.subjects,
        },
      });
      if (metadataError) {
        setMessage(`Your account was verified, but your teacher details could not be saved: ${metadataError.message}`);
        return;
      }

      const { error: profileError } = await supabase.from("profiles").upsert({
        id: data.user.id,
        name: fullName,
        first_name: profile.firstName,
        surname: profile.surname,
        phone_number: profile.phoneNumber,
        classes: profile.classes,
        subjects: profile.subjects,
        email: data.user.email.toLowerCase(),
        updated_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
      });
      if (profileError) {
        setMessage(`Your account was verified, but your teacher profile could not be saved: ${profileError.message}`);
        return;
      }

      sessionStorage.removeItem(GOOGLE_PROFILE_DRAFT_KEY);
      window.location.replace("/dashboard");
    }

    void completeSignIn();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center bg-cream px-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 text-center shadow-soft">
        <h1 className="font-display text-3xl text-ink">Finishing your sign-in</h1>
        <p role={message ? "alert" : "status"} className="mt-4 text-sm leading-6 text-ink/65">
          {message || "Saving your teacher details…"}
        </p>
        {message && (
          <Link href="/" className="mt-6 inline-flex rounded-xl bg-leaf px-5 py-3 font-semibold text-white">
            Return to sign in
          </Link>
        )}
      </div>
    </main>
  );
}
