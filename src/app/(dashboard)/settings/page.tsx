"use client";

import Link from "next/link";
import { ArrowUpRight, Sparkles } from "lucide-react";
import { PageIntro } from "@/components/layout/page-intro";
import { SettingsSurface } from "@/components/settings/settings-surface";

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto">
      <div className="workspace-page workspace-stack max-w-7xl">
        <PageIntro
          eyebrow="Preferences"
          title="Settings is the source of truth for workspace visuals and reading behavior."
          description="Theme, density, typography, motion, notifications, and chat readability live here with live preview. Platform administration stays in Admin so this page can stay honest about what it controls."
          aside={
            <div className="surface-subtle workspace-panel flex items-start gap-3 p-5">
              <div className="brand-chip flex h-10 w-10 items-center justify-center rounded-[var(--workspace-radius-md)] text-white">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div>
                <h2 className="text-base font-semibold">Platform controls stay separate</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  API endpoints, maintenance mode, and backend operations still live in Admin.
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
          }
        />

        <SettingsSurface variant="page" />
      </div>
    </div>
  );
}
