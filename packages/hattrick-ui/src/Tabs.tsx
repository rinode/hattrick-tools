import { type JSX, type ReactNode, useState } from "react";

export interface TabDef {
  id: string;
  label: string;
  content: ReactNode;
}

/**
 * A segmented tab bar plus panels, using the shared theme's global classes
 * (.tabbar, .tab-btn, .tab-panel). The active panel is kept mounted so inputs
 * don't lose state when switching tabs.
 */
export function Tabs({ tabs }: { tabs: TabDef[] }): JSX.Element {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  return (
    <>
      <div className="tabbar" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={t.id === active}
            className={`tab-btn${t.id === active ? " active" : ""}`}
            onClick={() => setActive(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          className={`tab-panel${t.id === active ? " active" : ""}`}
        >
          {t.content}
        </div>
      ))}
    </>
  );
}
