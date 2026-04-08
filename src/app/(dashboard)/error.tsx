"use client";

import Link from "next/link";

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/80 backdrop-blur-xl shadow-[0_0_40px_rgba(251,86,91,0.08)] p-8 space-y-6">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-2">
          <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {error.message || "An unexpected error occurred."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-destructive/90 hover:shadow-[0_0_20px_rgba(251,86,91,0.3)] active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-muted-foreground text-center transition-all duration-200 hover:bg-secondary hover:text-foreground hover:border-foreground/10"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
