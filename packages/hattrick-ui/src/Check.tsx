import type { JSX } from "react";
import { Checkbox } from "@base-ui/react/checkbox";
import styles from "./Check.module.css";

/** A checkbox with an inline label (Base UI Checkbox). */
export function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): JSX.Element {
  return (
    <label className={styles.check}>
      <Checkbox.Root className={styles.box} checked={checked} onCheckedChange={(c) => onChange(c)}>
        <Checkbox.Indicator className={styles.indicator}>
          <svg viewBox="0 0 14 14" width="10" height="10" aria-hidden="true">
            <path
              d="M11.5 3.5 5.5 10 2.5 7"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Checkbox.Indicator>
      </Checkbox.Root>
      {label}
    </label>
  );
}
