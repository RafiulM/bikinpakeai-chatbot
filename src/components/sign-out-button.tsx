import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

/** `compact` shows only the icon, for slim bars; the name stays "Sign out". */
export function SignOutButton({
  compact = false,
  title,
}: {
  compact?: boolean;
  title?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);
  const router = useRouter();
  const navigate = useNavigate();
  async function signOut() {
    setPending(true);
    setError(false);
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Sign out failed");
      await router.invalidate();
      await navigate({ to: "/sign-in", replace: true });
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t sign out. Try again.
        </p>
      )}
      {compact ? (
        <Button
          onClick={signOut}
          disabled={pending}
          variant="ghost"
          size="icon"
          aria-label="Sign out"
          title={title ?? "Sign out"}
          className="text-muted-foreground"
        >
          <LogOut aria-hidden="true" />
        </Button>
      ) : (
        <Button
          onClick={signOut}
          disabled={pending}
          variant="outline"
          size="sm"
        >
          <LogOut aria-hidden="true" />
          {pending ? "Signing out…" : "Sign out"}
        </Button>
      )}
    </div>
  );
}
