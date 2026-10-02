import { MessageCircleQuestion } from "lucide-react";

/** Quick-start questions for an empty conversation. Clicking one sends it. */
export function SuggestedQuestions({
  questions,
  disabled,
  onPick,
}: {
  questions: readonly string[];
  disabled?: boolean;
  onPick: (question: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <p
        id="suggested-questions-label"
        className="text-xs font-semibold text-muted-foreground"
      >
        Belum tahu mau tanya apa? Coba salah satu:
      </p>
      <ul
        aria-labelledby="suggested-questions-label"
        className="flex flex-wrap gap-2"
      >
        {questions.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onPick(question)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-canvas-warm px-3 py-1.5 text-left text-sm text-foreground/85 transition-colors hover:border-border-strong hover:bg-card disabled:cursor-not-allowed disabled:text-muted-foreground"
            >
              <MessageCircleQuestion
                className="size-3.5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
