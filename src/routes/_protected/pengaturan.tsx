import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { siteConfig } from "@/config/site";
import { DemoDataCard } from "@/components/lab/settings/demo-data-card";
import { OpenRouterKeyCard } from "@/components/lab/settings/openrouter-key-card";
import { labApi } from "@/lib/lab/api-client";
import type { AiSettings } from "@/lib/lab/types";

export const Route = createFileRoute("/_protected/pengaturan")({
  head: () => ({ meta: [{ title: `Pengaturan | ${siteConfig.name}` }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const [settings, setSettings] = useState<AiSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    labApi
      .getAiSettings()
      .then((loaded) => {
        if (active) setSettings(loaded);
      })
      .catch(() => {
        if (active)
          setError(
            "Pengaturan gagal dimuat. Muat ulang halaman untuk mencoba lagi.",
          );
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="grid max-w-[1200px] gap-6">
      <div>
        <h1 className="text-[22px] leading-tight font-medium tracking-tight">
          Pengaturan
        </h1>
        <p className="text-sm text-muted-foreground">
          Kunci model AI dan data demo untuk akun ini
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-danger-text">
          {error}
        </p>
      )}
      {!settings && !error && (
        <p role="status" className="text-sm text-muted-foreground">
          Memuat pengaturan…
        </p>
      )}
      {settings && (
        <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
          <OpenRouterKeyCard settings={settings} onChange={setSettings} />
          <DemoDataCard source={settings.source} />
        </div>
      )}
    </div>
  );
}
