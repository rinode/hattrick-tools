import { type JSX, type ReactNode, useEffect, useState } from "react";

export interface AppShellProps {
  title: string;
  /** Drawer contents (e.g. a <Tabs/>). */
  controls: ReactNode;
  /** The main stage area. */
  children: ReactNode;
}

/**
 * App chrome: a sticky header with a title and a hamburger that opens a
 * slide-in settings drawer over the stage. Uses the shared theme's global
 * classes (header, #controls, .drawer-backdrop, .panel). Escape closes.
 */
export function AppShell({ title, controls, children }: AppShellProps): JSX.Element {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <>
      <header>
        <h1>{title}</h1>
        <button
          type="button"
          className="menu-toggle"
          aria-label="Settings"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </header>
      <main>
        <div className={`drawer-backdrop${open ? " open" : ""}`} onClick={() => setOpen(false)} />
        <div id="controls" className={`panel${open ? " open" : ""}`}>
          {controls}
        </div>
        {children}
      </main>
      <footer className="app-footer">
        Player and avatar graphics are the intellectual property of Hattrick, used under the{" "}
        <a
          href="https://wiki.hattrick.org/wiki/Hattrick_Terms_of_Use"
          target="_blank"
          rel="noopener noreferrer"
        >
          Hattrick Terms of Use
        </a>
        . Unofficial fan tool, not affiliated with or endorsed by Hattrick.
      </footer>
    </>
  );
}
