import type { Metadata } from "next";
import { PromoteAdminForm } from "@/components/promote-admin-form";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PromoteAdminPage() {
  return <PromoteAdminForm />;
}
