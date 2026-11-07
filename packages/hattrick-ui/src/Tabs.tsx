import { type JSX, type ReactNode } from "react";
import { Tabs as Base } from "@base-ui/react/tabs";
import styles from "./Tabs.module.css";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/** A segmented tab bar plus panels, built on Base UI Tabs. */
export function Tabs({ tabs }: { tabs: TabDef[] }): JSX.Element {
  return (
    <Base.Root className={styles.root} defaultValue={tabs[0]?.id}>
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
