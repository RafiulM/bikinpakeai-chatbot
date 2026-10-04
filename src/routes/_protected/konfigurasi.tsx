import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { InstructionsPanel } from "@/components/lab/config/instructions-panel";
import { KnowledgeBrowser } from "@/components/lab/config/knowledge-browser";
import { ModelsPanel } from "@/components/lab/config/models-panel";
import { PolicyPanel } from "@/components/lab/config/policy-panel";
import { TemplatesPanel } from "@/components/lab/config/templates-panel";
import { loadAgentConfigFn } from "@/lib/lab/agent-config.functions";
import { CONFIG_TABS, type ConfigTab } from "@/lib/lab/search";

// Agent configuration: the knowledge base, instructions, policy, fixed
// replies and models the customer-support agent works from, one tab each.
// Read-only. ?tab and ?doc keep the open tab and document in the address, so
// Debug can link straight to one document.
export const Route = createFileRoute("/_protected/konfigurasi")({
  head: () => ({ meta: [{ title: `Konfigurasi Agent | ${siteConfig.name}` }] }),
  loader: () => loadAgentConfigFn(),
  component: AgentConfigPage,
});

const TAB_LABEL: Record<ConfigTab, string> = {
  dokumen: "Dokumen",
  instruksi: "Instruksi",
  kebijakan: "Kebijakan",
  template: "Template",
  model: "Model",
};

function AgentConfigPage() {
  const config = Route.useLoaderData();
  const { tab = "dokumen", doc } = Route.useSearch();
  const navigate = Route.useNavigate();
  const count: Partial<Record<ConfigTab, number>> = {
    dokumen: config.knowledge.length,
    kebijakan: config.policy.length,
    template: config.templates.length,
  };

  // Switching tabs or documents replaces the entry, so Back leaves the page.
  function open(next: { tab?: ConfigTab; doc?: string }) {
    void navigate({
      search: (prev) => ({ ...prev, ...next }),
      replace: true,
      resetScroll: false,
    });
  }

  return (
    <Tabs
      value={tab}
      onValueChange={(value) => open({ tab: value as ConfigTab })}
      className="gap-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[22px] leading-tight font-medium tracking-tight">
            Konfigurasi Agent
          </h1>
          <p className="text-sm text-muted-foreground">
            Dokumen, instruksi, kebijakan, dan model yang menjadi konteks agent
            customer support
          </p>
        </div>
        <div className="max-w-full overflow-x-auto [scrollbar-width:none]">
          <TabsList
            aria-label="Bagian konfigurasi"
            className="h-auto rounded-full border bg-card p-[3px]"
          >
            {CONFIG_TABS.map((id) => (
              <TabsTrigger
                key={id}
                value={id}
                className="h-auto flex-none rounded-full px-3.5 py-1.5 text-muted-foreground data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
              >
                {TAB_LABEL[id]}{" "}
                {count[id] !== undefined && (
                  <b className="font-semibold tabular-nums">{count[id]}</b>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
      </div>

      <TabsContent value="dokumen">
        <KnowledgeBrowser
          knowledge={config.knowledge}
          docLimit={config.answer.docLimit}
          selectedId={doc}
          onSelect={(id) => open({ doc: id })}
        />
      </TabsContent>
      <TabsContent value="instruksi">
        <InstructionsPanel config={config} />
      </TabsContent>
      <TabsContent value="kebijakan">
        <PolicyPanel policy={config.policy} />
      </TabsContent>
      <TabsContent value="template">
        <TemplatesPanel templates={config.templates} />
      </TabsContent>
      <TabsContent value="model">
        <ModelsPanel config={config} />
      </TabsContent>
    </Tabs>
  );
}
