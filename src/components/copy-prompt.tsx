import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CopyPrompt({ text }: { text: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setStatus("copied");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button variant="outline" size="sm" onClick={copy}>
        {status === "copied" ? (
          <Check aria-hidden="true" />
        ) : (
          <Copy aria-hidden="true" />
        )}
        {status === "copied" ? "Copied" : "Copy prompt"}
      </Button>
      <span role="status" className="text-sm text-muted-foreground">
        {status === "error"
          ? "Select the prompt above and copy it manually."
          : status === "copied"
            ? "Paste it into your AI editor."
            : ""}
      </span>
    </div>
  );
}
