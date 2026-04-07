export default function Loading() {
  return (
    <div className="min-h-full bg-[#050507] p-6 space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded-lg bg-[#1a1a1c] animate-pulse" />
          <div className="h-4 w-64 rounded-md bg-[#1a1a1c] animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-24 rounded-xl bg-[#1a1a1c] animate-pulse" />
          <div className="h-8 w-28 rounded-xl bg-[#1a1a1c] animate-pulse" />
        </div>
      </div>

      {/* Stat cards skeleton */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-[#3d3a39]/30 bg-[#101010]/60 p-4 space-y-3"
          >
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 rounded bg-[#1a1a1c] animate-pulse" />
              <div className="h-3 w-20 rounded bg-[#1a1a1c] animate-pulse" />
            </div>
            <div className="h-6 w-16 rounded bg-[#1a1a1c] animate-pulse" />
          </div>
        ))}
      </div>

      {/* Large panel skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-2 rounded-xl border border-[#3d3a39]/30 bg-[#101010]/60 p-4 space-y-4">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#1a1a1c] animate-pulse" />
            <div className="h-4 w-28 rounded bg-[#1a1a1c] animate-pulse" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[#3d3a39]/20 p-3"
            >
              <div className="h-10 w-10 rounded-full bg-[#1a1a1c] animate-pulse shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 rounded bg-[#1a1a1c] animate-pulse" />
                <div className="h-3 w-48 rounded bg-[#1a1a1c] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-[#3d3a39]/30 bg-[#101010]/60 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-[#1a1a1c] animate-pulse" />
            <div className="h-4 w-24 rounded bg-[#1a1a1c] animate-pulse" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 rounded-xl border border-[#3d3a39]/20 p-3"
            >
              <div className="h-4 w-4 rounded bg-[#1a1a1c] animate-pulse shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 w-20 rounded bg-[#1a1a1c] animate-pulse" />
                <div className="h-2.5 w-28 rounded bg-[#1a1a1c] animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
