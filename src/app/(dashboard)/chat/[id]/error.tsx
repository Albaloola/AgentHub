"use client";

import Link from "next/link";

export default function ChatError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="min-h-full flex items-center justify-center bg-[#050507] starfield p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#3d3a39] bg-[#101010]/80 backdrop-blur-xl shadow-[0_0_40px_rgba(251,86,91,0.08)] p-8 space-y-6">
        {/* Error icon */}
        <div className="flex justify-center">
          <div className="h-12 w-12 rounded-full bg-[#fb565b]/10 border border-[#fb565b]/20 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-[#fb565b]"
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
          <h2 className="text-lg font-semibold text-[#f2f2f2]">Conversation error</h2>
          <p className="text-sm text-[#f2f2f2]/50 leading-relaxed">
            {error.message || "Failed to load this conversation."}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full rounded-xl bg-[#fb565b] px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:bg-[#fb565b]/90 hover:shadow-[0_0_20px_rgba(251,86,91,0.3)] active:scale-[0.98]"
          >
            Try again
          </button>
          <Link
            href="/"
            className="w-full rounded-xl border border-[#3d3a39] bg-[#101010] px-4 py-2.5 text-sm font-medium text-[#f2f2f2]/70 text-center transition-all duration-200 hover:bg-[#1a1a1c] hover:text-[#f2f2f2] hover:border-[#f2f2f2]/10"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
