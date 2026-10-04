import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DisplaySettings } from "@/lib/lab/types";

// The account's display settings for every view. The first value comes from
// the route loader (server rendered); Pengaturan updates it after saving, so
// the shell and Chat switch layout at once.

interface DisplaySettingsValue {
  settings: DisplaySettings;
  setSettings: (settings: DisplaySettings) => void;
}

const DisplaySettingsContext = createContext<DisplaySettingsValue | null>(null);

export function DisplaySettingsProvider({
  initial,
  children,
}: {
  initial: DisplaySettings;
  children: ReactNode;
}) {
  const [settings, setSettings] = useState(initial);
  const value = useMemo(() => ({ settings, setSettings }), [settings]);
  return (
    <DisplaySettingsContext.Provider value={value}>
      {children}
    </DisplaySettingsContext.Provider>
  );
}

export function useDisplaySettings() {
  const value = useContext(DisplaySettingsContext);
  if (!value)
    throw new Error(
      "useDisplaySettings must be used inside DisplaySettingsProvider.",
    );
  return value;
}
