"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-5 text-center">
      <h2 className="text-xl font-semibold">Something went wrong</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. You can retry, or head back to your dashboard.
      </p>
      <div className="flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<Link href="/dashboard" />}>
          Dashboard
        </Button>
      </div>
    </div>
  );
}
