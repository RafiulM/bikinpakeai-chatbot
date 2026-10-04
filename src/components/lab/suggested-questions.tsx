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
    <ul
      aria-label="Contoh pertanyaan"
      className="flex max-w-[720px] flex-wrap justify-center gap-2"
    >
      {questions.map((question) => (
        <li key={question}>
          <button
            type="button"
            disabled={disabled}
            onClick={() => onPick(question)}
            className="rounded-full border bg-card px-3.5 py-2 text-left text-sm text-foreground/85 transition-colors hover:border-border-strong disabled:cursor-not-allowed disabled:text-muted-foreground"
          >
            {question}
          </button>
        </li>
      ))}
    </ul>
  );
}
