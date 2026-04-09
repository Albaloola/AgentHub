import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="space-y-2">
        <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground">404</p>
        <h1 className="text-3xl font-semibold">Page not found</h1>
        <p className="text-sm text-muted-foreground">
          The page you requested does not exist or has moved.
        </p>
      </div>
      <Link
        href="/"
        className="rounded-md border border-border px-4 py-2 text-sm transition-colors hover:bg-muted"
      >
        Back to dashboard
      </Link>
    </div>
  );
}
