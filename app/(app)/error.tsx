"use client";

import { Button } from "@/components/ui/button";

/**
 * Error boundary INSIDE the authed shell, so a page-level error keeps the header
 * (and the profile/sign-out menu) visible instead of blanking the whole app.
 */
export default function AppError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-4 px-5 py-24 text-center">
      <h2 className="text-xl font-semibold">This view hit an error</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        Something failed while loading this page. Use the profile menu (top-right)
        to sign out, or retry below.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" render={<a href="/dashboard" />}>
          Dashboard
        </Button>
        <Button variant="ghost" render={<a href="/auth/signout" />}>
          Log out
        </Button>
      </div>
    </div>
  );
}
