import { signInWithGoogle } from "./actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 35 24 35c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 3.1 29.5 1 24 1 11.8 1 2 10.8 2 23s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.1-2.3-.4-2.5z"
      />
      <path
        fill="#FF3D00"
        d="M3.2 12.6l6.6 4.8C11.5 14 17.3 11 24 11c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 3.1 29.5 1 24 1 16 1 9 5.4 3.2 12.6z"
      />
      <path
        fill="#4CAF50"
        d="M24 45c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 36 26.7 37 24 37c-5.3 0-9.7-2.6-11.3-7l-6.5 5C9.5 41.5 16.2 45 24 45z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.9 36.6 45 31 45 23c0-1.3-.1-2.3-.4-2.5z"
      />
    </svg>
  );
}

/**
 * Server component: the ONLY sign-in entry point. Posts to the signInWithGoogle
 * server action — there is no email/password path anywhere in the app.
 */
export function SignInButton({
  className,
  label = "Sign in with Google",
  variant = "default",
}: {
  className?: string;
  label?: string;
  variant?: "default" | "outline" | "secondary";
}) {
  return (
    <form action={signInWithGoogle}>
      <Button type="submit" variant={variant} className={cn("gap-2", className)}>
        <GoogleGlyph />
        {label}
      </Button>
    </form>
  );
}
