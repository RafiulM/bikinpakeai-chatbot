import type { AgentConfig, TemplateId } from "@/lib/lab/types";
import { ConfigPanel } from "./config-panel";

const TEMPLATE: Record<TemplateId, { label: string; when: string }> = {
  blocked: {
    label: "Penolakan",
    when: "Pesan berisi upaya prompt injection.",
  },
  masked: {
    label: "Keamanan data",
    when: "Ada data sensitif dan tidak ada alasan eskalasi.",
  },
  escalated: {
    label: "Eskalasi",
    when: "Frustrasi atau risiko churn tinggi, minta refund, atau bug mendesak.",
  },
  clarify: {
    label: "Klarifikasi",
    when: "Pesan kurang jelas dan produknya belum diketahui.",
  },
  feature: {
    label: "Saran fitur",
    when: "Pelanggan mengusulkan fitur.",
  },
  safeFallback: {
    label: "Balasan aman",
    when: "Draf model gagal pemeriksaan kebijakan, atau model gagal dihubungi.",
  },
};

const MARKER = /(\{\{[^}]+\}\})/;

/** Fixed replies the Jev path sends without calling any model. */
export function TemplatesPanel({
  templates,
}: {
  templates: AgentConfig["templates"];
}) {
  return (
    <ConfigPanel description="Hanya jalur Dengan Jev. Balasan tetap ini tidak memakai model maupun dokumen.">
      <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {templates.map((template) => (
          <li
            key={template.id}
            className="grid content-start gap-1.5 rounded-[12px] border p-4"
          >
            <span className="text-sm font-semibold">
              {TEMPLATE[template.id].label}
            </span>
            <span className="text-xs text-muted-foreground">
              Dipakai saat: {TEMPLATE[template.id].when}
            </span>
            <p className="text-sm text-foreground/85">
              {template.text.split(MARKER).map((part, index) =>
                MARKER.test(part) ? (
                  <span
                    key={index}
                    className="rounded bg-muted px-1 font-mono text-xs"
                  >
                    {part.slice(2, -2)}
                  </span>
                ) : (
                  part
                ),
              )}
            </p>
          </li>
        ))}
      </ul>
    </ConfigPanel>
  );
}
