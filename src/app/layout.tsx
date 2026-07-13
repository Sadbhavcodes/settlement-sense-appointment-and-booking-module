import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Settlement Sense — Hospital OS",
  description: "Settlement Sense Healthcare Operating System — Appointments, Patient Management & Analytics",
};

/**
 * Root layout for the Appointments module.
 * Navigation chrome (header, sidebar) is provided by AuthGuard when mounted
 * inside protected routes. The /login and /booking pages handle their own theming.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
