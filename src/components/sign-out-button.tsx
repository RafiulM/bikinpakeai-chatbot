import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
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
    <div className="flex flex-wrap items-center gap-2">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          Couldn’t sign out. Try again.
        </p>
      )}
      <Button onClick={signOut} disabled={pending} variant="outline" size="sm">
        <LogOut aria-hidden="true" />
        {pending ? "Signing out…" : "Sign out"}
      </Button>
    </div>
  );
}
