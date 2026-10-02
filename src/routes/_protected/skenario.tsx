import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { ScenarioCard } from "@/components/lab/scenarios/scenario-card";
import { SCENARIOS } from "@/lib/lab/scenarios";

export const Route = createFileRoute("/_protected/skenario")({
  head: () => ({
    meta: [{ title: `Skenario Siap Pakai | ${siteConfig.name}` }],
  }),
  component: ScenarioPage,
});

function ScenarioPage() {
  return (
    <div className="grid max-w-[1200px] gap-6">
      <div>
        <h1 className="text-[22px] leading-tight font-medium tracking-tight">
          Skenario Siap Pakai
        </h1>
        <p className="text-sm text-muted-foreground">
          {SCENARIOS.length} kasus contoh untuk memicu perilaku Jev tertentu
          saat demo
        </p>
      </div>
      <ul className="grid gap-3 md:grid-cols-2">
        {SCENARIOS.map((scenario) => (
          <li key={scenario.id}>
            <ScenarioCard scenario={scenario} />
          </li>
        ))}
      </ul>
    </div>
  );
}
