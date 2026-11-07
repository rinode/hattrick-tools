import { type JSX, type ReactNode } from "react";
import { Collapsible as Base } from "@base-ui/react/collapsible";
import styles from "./Collapsible.module.css";

/** A titled, default-expanded section that collapses on click (Base UI). */
export function Collapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}): JSX.Element {
  return (
    <Base.Root defaultOpen={defaultOpen} className={styles.root}>
      <Base.Trigger className={styles.trigger}>
        <svg
          className={styles.chevron}
          viewBox="0 0 16 16"
          width="12"
          height="12"
          aria-hidden="true"
        >
          <path
            d="M5 3l6 5-6 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {title}
      </Base.Trigger>
      <Base.Panel className={styles.panel}>
        <div className={styles.body}>{children}</div>
      </Base.Panel>
    </Base.Root>
  );
}
