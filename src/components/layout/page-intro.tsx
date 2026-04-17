import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageIntroProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  aside?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
  aside,
  className,
  compact = false,
}: PageIntroProps) {
  return (
    <section
      className={cn(
        "workspace-intro relative overflow-hidden",
        compact ? "workspace-intro--compact" : "workspace-intro--default",
        className,
      )}
    >
      <div className="workspace-intro__accent" aria-hidden="true" />
      <div className="workspace-intro__glow workspace-intro__glow--primary" aria-hidden="true" />
      <div className="workspace-intro__glow workspace-intro__glow--secondary" aria-hidden="true" />

      <div className={cn("workspace-intro__content", aside && "workspace-intro__content--split")}>
        <div className="workspace-intro__copy">
          {eyebrow ? <p className="workspace-eyebrow">{eyebrow}</p> : null}
          <div className="space-y-3">
            <h1 className="workspace-title">{title}</h1>
            {description ? <p className="workspace-description max-w-3xl">{description}</p> : null}
          </div>
          {actions ? <div className="workspace-actions">{actions}</div> : null}
        </div>

        {aside ? <div className="workspace-intro__aside">{aside}</div> : null}
      </div>
    </section>
  );
}
