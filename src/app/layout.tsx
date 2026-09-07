import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/SiteHeader";

export const metadata: Metadata = {
  title: "Family Tree POC",
  description:
    "A minimal Next.js family tree demonstrating an end-to-end GitHub to Vercel pipeline.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
