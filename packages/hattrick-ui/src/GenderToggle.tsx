import type { JSX } from "react";
import styles from "./GenderToggle.module.css";

export type Gender = "m" | "f";

/** A two-segment single-select control for male/female. */
export function GenderToggle({
  value,
  onChange,
}: {
  value: Gender;
  onChange: (g: Gender) => void;
}): JSX.Element {
  return (
    <div className={styles.toggle} role="radiogroup" aria-label="Gender">
      <button
        type="button"
        role="radio"
        aria-checked={value === "m"}
        aria-pressed={value === "m"}
        onClick={() => onChange("m")}
      >
        Male
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={value === "f"}
        aria-pressed={value === "f"}
        onClick={() => onChange("f")}
      >
        Female
      </button>
    </div>
  );
}
