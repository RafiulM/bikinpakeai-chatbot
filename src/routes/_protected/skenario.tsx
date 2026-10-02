import { useRef, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Play } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useLabConversation } from "@/components/lab/conversation-store";
import { CategorySection } from "@/components/lab/scenarios/category-accordion";
import {
  RunQueue,
  type RunItem,
  type RunState,
} from "@/components/lab/scenarios/run-queue";
import { ScenarioCard } from "@/components/lab/scenarios/scenario-card";
import { SegmentedControl } from "@/components/lab/segmented-control";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, SCENARIOS, type Scenario } from "@/lib/lab/scenarios";
import { ISSUE_TYPES, type IssueType } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/skenario")({
  head: () => ({
    meta: [{ title: `Skenario Siap Pakai | ${siteConfig.name}` }],
  }),
  component: ScenarioPage,
});

const GROUPS = ISSUE_TYPES.map((category) => ({
  category,
  scenarios: SCENARIOS.filter((scenario) => scenario.category === category),
})).filter((group) => group.scenarios.length > 0);

function ScenarioPage() {
  const { conversation, busy, runScenario } = useLabConversation();
  const [open, setOpen] = useState<Set<IssueType>>(
    () => new Set([GROUPS[0]?.category].filter(Boolean) as IssueType[]),
  );
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [queue, setQueue] = useState<RunItem[]>([]);
  const [running, setRunning] = useState(false);
  const stopRef = useRef(false);
  const [after, setAfter] = useState<"stay" | "compare" | "debug">("stay");
  const navigate = useNavigate();
  const queueRef = useRef<HTMLDivElement>(null);
  const allOpen = open.size === GROUPS.length;

  function toggleGroup(category: IssueType) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  function togglePick(id: string) {
    setPicked((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function setState(id: string, state: RunState) {
    setQueue((items) =>
      items.map((item) => (item.id === id ? { ...item, state } : item)),
    );
  }

  /** Sends the scenarios one by one, each after the previous reply arrived. */
  async function runAll(scenarios: Scenario[]) {
    if (running || busy || scenarios.length === 0) return;
    stopRef.current = false;
    setRunning(true);
    setQueue(
      scenarios.map((scenario) => ({
        id: scenario.id,
        name: scenario.name,
        expectedRoute: scenario.expectedRoute,
        state: "waiting",
      })),
    );
    if (window.matchMedia("(max-width: 1279px)").matches)
      queueRef.current?.scrollIntoView({ block: "start" });
    let lastMessageId: string | undefined;
    for (const scenario of scenarios) {
      if (stopRef.current) {
        setState(scenario.id, "stopped");
        continue;
      }
      setState(scenario.id, "running");
      const messageId = await runScenario(scenario.id, scenario.prompt);
      setState(scenario.id, messageId ? "done" : "failed");
      lastMessageId = messageId ?? lastMessageId;
    }
    setRunning(false);
    // Jump to the result only for a run that was not stopped halfway.
    if (!stopRef.current && lastMessageId && after !== "stay") {
      void navigate({
        to: after === "compare" ? "/compare" : "/debug",
        hash: `turn-${lastMessageId}`,
      });
    }
  }

  const pickedScenarios = SCENARIOS.filter((scenario) =>
    picked.has(scenario.id),
  );

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Skenario Siap Pakai
          </h1>
          <p className="text-sm text-muted-foreground">
            Dikirim ke percakapan aktif {conversation.code} · {SCENARIOS.length}{" "}
            kasus dalam {GROUPS.length} kategori
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p role="status" className="text-sm text-muted-foreground">
            {picked.size} dipilih
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setPicked(
                picked.size === SCENARIOS.length
                  ? new Set()
                  : new Set(SCENARIOS.map((scenario) => scenario.id)),
              )
            }
          >
            {picked.size === SCENARIOS.length
              ? "Kosongkan pilihan"
              : "Pilih semua"}
          </Button>
          <Button
            size="sm"
            disabled={picked.size === 0 || running || busy}
            onClick={() => void runAll(pickedScenarios)}
          >
            <Play aria-hidden="true" />
            Jalankan terpilih ({picked.size})
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-3">
          <div className="flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setOpen(
                  allOpen ? new Set() : new Set(GROUPS.map((g) => g.category)),
                )
              }
            >
              {allOpen ? "Tutup semua kategori" : "Buka semua kategori"}
            </Button>
          </div>
          {GROUPS.map((group) => (
            <CategorySection
              key={group.category}
              title={CATEGORY_LABEL[group.category]}
              count={group.scenarios.length}
              open={open.has(group.category)}
              onToggle={() => toggleGroup(group.category)}
            >
              <ul className="grid gap-3 lg:grid-cols-2">
                {group.scenarios.map((scenario) => (
                  <li key={scenario.id}>
                    <ScenarioCard
                      scenario={scenario}
                      select={
                        <label className="flex cursor-pointer items-start gap-2.5 text-[15px] leading-snug font-semibold">
                          <input
                            type="checkbox"
                            checked={picked.has(scenario.id)}
                            onChange={() => togglePick(scenario.id)}
                            className="mt-0.5 size-[18px] shrink-0 accent-foreground"
                          />
                          <span id={`scenario-${scenario.id}`}>
                            {scenario.name}
                          </span>
                        </label>
                      }
                      action={
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busy || running}
                          onClick={() => void runAll([scenario])}
                          aria-label={`Jalankan skenario ${scenario.name}`}
                        >
                          <Play aria-hidden="true" />
                          Jalankan
                        </Button>
                      }
                    />
                  </li>
                ))}
              </ul>
            </CategorySection>
          ))}
        </div>
        <div ref={queueRef} className="grid gap-3 xl:sticky xl:top-6">
          <div className="grid gap-2 rounded-[20px] border bg-card p-4">
            <p id="after-run-label" className="text-sm font-semibold">
              Setelah antrean selesai, buka:
            </p>
            <SegmentedControl
              legend="Tampilan setelah skenario selesai"
              value={after}
              onChange={setAfter}
              options={[
                { value: "stay", label: "Tetap di sini" },
                { value: "compare", label: "Compare" },
                { value: "debug", label: "Debug" },
              ]}
            />
          </div>
          <RunQueue
            items={queue}
            running={running}
            onStop={() => {
              stopRef.current = true;
            }}
            onClear={() => setQueue([])}
          />
        </div>
      </div>
    </div>
  );
}
