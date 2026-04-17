"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { SettingsSurface } from "@/components/settings/settings-surface";

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto px-6 py-6 md:px-8 md:py-8">
      <div className="mx-auto mb-6 grid max-w-7xl gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--panel-bg)] p-6 shadow-[var(--panel-shadow)]">
          <p className="text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Canonical surface
          </p>
          <h1 className="title-font settings-display-title mt-3 font-semibold tracking-tight">
            Settings now owns runtime visuals and reading preferences
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
            Theme selection, motion, typography, markdown, notifications, and feedback live here.
            Changes preview immediately and save locally when you commit them.
          </p>
        </div>

        <div className="rounded-[1.5rem] border border-[var(--panel-border)] bg-[var(--surface-subtle)] p-6 shadow-[var(--panel-shadow)]">
          <div className="flex items-start gap-3">
            <div className="brand-chip flex h-10 w-10 items-center justify-center rounded-[1rem] text-white">
              <Sparkles className="h-4.5 w-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold">System-level controls stay in Admin</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                API endpoints, maintenance mode, and backend operational settings were left alone and can still be managed from Admin.
              </p>
              <Link
                href="/admin"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-[var(--theme-accent-text)] transition-colors hover:text-foreground"
              >
                Open Admin
                <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <SettingsSurface variant="page" />
    </div>
  );
}
