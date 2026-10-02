import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { CategorySection } from "@/components/lab/scenarios/category-accordion";
import { ScenarioCard } from "@/components/lab/scenarios/scenario-card";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABEL, SCENARIOS } from "@/lib/lab/scenarios";
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
  const [open, setOpen] = useState<Set<IssueType>>(
    () => new Set([GROUPS[0]?.category].filter(Boolean) as IssueType[]),
  );
  const allOpen = open.size === GROUPS.length;

  function toggle(category: IssueType) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Skenario Siap Pakai
          </h1>
          <p className="text-sm text-muted-foreground">
            {SCENARIOS.length} kasus contoh dalam {GROUPS.length} kategori untuk
            memicu perilaku Jev tertentu saat demo
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            setOpen(
              allOpen ? new Set() : new Set(GROUPS.map((g) => g.category)),
            )
          }
        >
          {allOpen ? "Tutup semua" : "Buka semua"}
        </Button>
      </div>
      <div className="grid gap-3">
        {GROUPS.map((group) => (
          <CategorySection
            key={group.category}
            title={CATEGORY_LABEL[group.category]}
            count={group.scenarios.length}
            open={open.has(group.category)}
            onToggle={() => toggle(group.category)}
          >
            <ul className="grid gap-3 md:grid-cols-2">
              {group.scenarios.map((scenario) => (
                <li key={scenario.id}>
                  <ScenarioCard scenario={scenario} />
                </li>
              ))}
            </ul>
          </CategorySection>
        ))}
      </div>
    </div>
  );
}
