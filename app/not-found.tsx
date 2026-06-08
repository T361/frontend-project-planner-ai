import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/atoms/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-5 text-center">
      <Logo />
      <h2 className="text-2xl font-semibold">Page not found</h2>
      <p className="max-w-sm text-sm text-muted-foreground">
        This plan or page doesn’t exist, or you don’t have access to it.
      </p>
      <Button render={<Link href="/dashboard" />}>Go to dashboard</Button>
    </div>
  );
}
