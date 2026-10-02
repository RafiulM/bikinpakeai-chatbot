import type { ReactNode } from "react";
import { Check, X } from "lucide-react";
import type { BotResponse, ConversationTurn } from "@/lib/lab/types";
import { formatSeconds, formatUsd } from "@/lib/lab/format";

/** Side card: the latest message answered both ways, in numbers. */
export function LastTurnCard({ turn }: { turn: ConversationTurn | undefined }) {
  return (
    <section
      aria-labelledby="last-turn-title"
      className="grid gap-3 rounded-[20px] border bg-card p-5"
    >
      <h2 id="last-turn-title" className="text-[17px] font-semibold">
        Pesan terakhir, dua jawaban
      </h2>
      {!turn || !turn.withJev || !turn.withoutJev ? (
        <p className="text-sm text-muted-foreground">
          Kirim pertanyaan untuk melihat jawaban dengan dan tanpa Jev.
        </p>
      ) : (
        <>
          <p className="border-l-2 border-border-strong pl-3 text-sm text-foreground/80">
            “{turn.message.content}”
          </p>
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">
              Perbandingan jawaban untuk pesan terakhir
            </caption>
            <thead>
              <tr className="border-b text-xs text-muted-foreground">
                <td className="py-2" />
                <th scope="col" className="py-2 pl-2 text-left font-semibold">
                  Dengan Jev
                </th>
                <th scope="col" className="py-2 pl-2 text-left font-semibold">
                  Tanpa Jev
                </th>
              </tr>
            </thead>
            <tbody className="tabular-nums [&_tr]:border-b [&_tr:last-child]:border-0">
              <Row label="Waktu">
                {formatSeconds(turn.withJev.latencyMs)}
                {formatSeconds(turn.withoutJev.latencyMs)}
              </Row>
              <Row label="Biaya">
                {formatUsd(turn.withJev.costUsd)}
                {formatUsd(turn.withoutJev.costUsd)}
              </Row>
              <Row label="Hasil">
                <VerdictText response={turn.withJev} />
                <VerdictText response={turn.withoutJev} />
              </Row>
            </tbody>
          </table>
        </>
      )}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: [ReactNode, ReactNode];
}) {
  return (
    <tr>
      <th
        scope="row"
        className="py-2 text-left align-top font-medium text-muted-foreground"
      >
        {label}
      </th>
      <td className="py-2 pl-2 align-top">{children[0]}</td>
      <td className="py-2 pl-2 align-top">{children[1]}</td>
    </tr>
  );
}

function VerdictText({ response }: { response: BotResponse }) {
  const good = response.review.verdict !== "wrong";
  const Icon = good ? Check : X;
  return (
    <span className="inline-flex items-start gap-1">
      <Icon
        className={
          good ? "mt-0.5 size-3.5 text-positive" : "mt-0.5 size-3.5 text-danger"
        }
        aria-hidden="true"
      />
      {response.review.issues[0] ?? response.review.verdictLabel}
    </span>
  );
}
