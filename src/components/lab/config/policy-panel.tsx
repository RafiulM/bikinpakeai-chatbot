import { ConfigPanel } from "./config-panel";

/** The support policy both paths put in their instructions. */
export function PolicyPanel({ policy }: { policy: string[] }) {
  return (
    <ConfigPanel description="Dikirim ke kedua jalur. Dengan Jev, draf jawaban juga diperiksa terhadap kebijakan ini sebelum dikirim.">
      <ol className="grid gap-2 lg:grid-cols-2">
        {policy.map((line, index) => (
          <li
            key={line}
            className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[12px] border p-3 text-sm"
          >
            <span
              aria-hidden="true"
              className="grid size-6 place-items-center rounded-full bg-muted text-xs font-semibold tabular-nums"
            >
              {index + 1}
            </span>
            {line}
          </li>
        ))}
      </ol>
    </ConfigPanel>
  );
}
