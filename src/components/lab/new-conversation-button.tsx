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
        <Button disabled={disabled}>
          <Plus aria-hidden="true" />
          Percakapan baru
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mulai percakapan baru?</AlertDialogTitle>
          <AlertDialogDescription>
            Percakapan {currentCode} ({messageCount} pesan) akan diakhiri dan
            tetap tersimpan beserta hasil perbandingannya. Layar chat
            dikosongkan supaya kamu bisa mencoba kasus lain.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Mulai percakapan baru
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
