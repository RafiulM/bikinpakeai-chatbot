import { CircleCheck, Hand, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SupportTicket } from "@/lib/lab/types";

/** Claim, close, or reopen — only the actions that fit the current status. */
export function TicketActions({
  ticket,
  onClaim,
  onClose,
  onReopen,
}: {
  ticket: SupportTicket;
  onClaim: () => void;
  onClose: () => void;
  onReopen: () => void;
}) {
  if (ticket.status === "closed") {
    return (
      <Button variant="outline" size="sm" onClick={onReopen}>
        <RotateCcw aria-hidden="true" />
        Buka lagi
      </Button>
    );
  }
  return (
    <>
      {ticket.status === "open" && (
        <Button variant="outline" size="sm" onClick={onClaim}>
          <Hand aria-hidden="true" />
          Klaim
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={onClose}>
        <CircleCheck aria-hidden="true" />
        Tutup tiket
      </Button>
    </>
  );
}
