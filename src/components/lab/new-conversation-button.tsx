import { Plus } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * Starts a fresh conversation after an explicit confirmation. The current
 * conversation is ended, not deleted, so its comparison data stays available.
 */
export function NewConversationButton({
  currentCode,
  messageCount,
  disabled,
  onConfirm,
}: {
  currentCode: string;
  messageCount: number;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size="icon-lg"
          disabled={disabled}
          aria-label="Percakapan baru"
          title="Percakapan baru"
        >
          <Plus aria-hidden="true" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mulai percakapan baru?</AlertDialogTitle>
          <AlertDialogDescription>
            Percakapan {currentCode} ({messageCount} pesan) tetap tersimpan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Mulai baru</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
