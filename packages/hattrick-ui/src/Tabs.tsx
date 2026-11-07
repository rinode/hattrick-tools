import { type JSX, type ReactNode, useState } from "react";
import { Tabs as Base } from "@base-ui/react/tabs";
import styles from "./Tabs.module.css";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/** A segmented tab bar plus panels, built on Base UI Tabs. When `storageKey`
 *  is given, the selected tab is remembered in localStorage across reloads. */
export function Tabs({ tabs, storageKey }: { tabs: TabDef[]; storageKey?: string }): JSX.Element {
  const ids = tabs.map((t) => t.id);
  const first = tabs[0]?.id;
  const [value, setValue] = useState<string | undefined>(() => {
    if (storageKey) {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved && ids.includes(saved)) return saved;
      } catch {
        /* storage unavailable */
      }
    }
    return first;
  });

  const onValueChange = (next: string): void => {
    setValue(next);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, next);
      } catch {
        /* storage unavailable */
      }
    }
  };

  return (
    <Base.Root
      className={styles.root}
      value={value}
      onValueChange={(v) => onValueChange(v as string)}
    >
      <Base.List className={styles.list}>
        {tabs.map((t) => (
          <Base.Tab key={t.id} value={t.id} className={styles.tab}>
            {t.label}
          </Base.Tab>
        ))}
      </Base.List>
      {tabs.map((t) => (
        <Base.Panel key={t.id} value={t.id} className={styles.panel}>
          {t.content}
        </Base.Panel>
      ))}
    </Base.Root>
  );
}
