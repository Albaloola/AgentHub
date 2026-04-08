import { Skeleton } from "@/components/ui/skeleton";

export default function ChatLoading() {
  return (
    <div className="flex h-full min-h-0">
      <div className="flex flex-1 flex-col min-h-0 min-w-0">
        {/* Header skeleton */}
        <div className="flex items-center gap-2 px-2 shrink-0 py-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-4 w-24" />
          <div className="flex-1" />
          <Skeleton className="h-6 w-14 rounded-md" />
          <Skeleton className="h-6 w-16 rounded-md" />
        </div>

        {/* Message bubbles skeleton */}
        <div className="flex-1 min-h-0 overflow-hidden p-6">
          <div className="mx-auto max-w-3xl space-y-4">
            <div className="flex justify-end">
              <Skeleton className="h-12 w-[55%] rounded-2xl" />
            </div>
            <div className="flex justify-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-1" />
              <div className="space-y-2 flex-1 max-w-[70%]">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[85%]" />
                <Skeleton className="h-4 w-[60%]" />
              </div>
            </div>
            <div className="flex justify-end">
              <Skeleton className="h-10 w-[40%] rounded-2xl" />
            </div>
            <div className="flex justify-start gap-3">
              <Skeleton className="h-8 w-8 rounded-full shrink-0 mt-1" />
              <div className="space-y-2 flex-1 max-w-[65%]">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-[90%]" />
                <Skeleton className="h-4 w-[75%]" />
                <Skeleton className="h-4 w-[45%]" />
              </div>
            </div>
          </div>
        </div>

        {/* Input skeleton */}
        <div className="px-6 pb-6">
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
