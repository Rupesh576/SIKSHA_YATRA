import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Teacher Learning Portal | Stemtech Innovation Foundation", description: "A shared learning space for teachers and educators." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
