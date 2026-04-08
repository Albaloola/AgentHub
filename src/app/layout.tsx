import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import { ThemeBackground } from "@/components/ui/theme-background";
import { ThemeTransitionOverlay } from "@/components/ui/theme-transition-overlay";
import { UiPrefsApplier } from "@/components/ui/ui-prefs-applier";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/geist-sans.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/geist-mono.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AgentHub",
  description: "Multi-agent dashboard for connecting, chatting with, and orchestrating autonomous AI agents",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeBackground />
        <ThemeTransitionOverlay />
        <UiPrefsApplier />
        {children}
        <Toaster />
      </body>
    </html>
  );
}
