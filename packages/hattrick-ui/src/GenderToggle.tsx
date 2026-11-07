import type { JSX } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import styles from "./GenderToggle.module.css";

export type Gender = "m" | "f";

/** A two-segment single-select control for male/female (Base UI ToggleGroup). */
export function GenderToggle({
  value,
  onChange,
}: {
  value: Gender;
  onChange: (g: Gender) => void;
}): JSX.Element {
  return (
    <ToggleGroup
      className={styles.group}
      value={[value]}
      onValueChange={(groupValue) => {
        const next = (groupValue as string[]).find((v) => v !== value);
        if (next === "m" || next === "f") onChange(next);
      }}
    >
      <Toggle className={styles.toggle} value="m">
        Male
      </Toggle>
      <Toggle className={styles.toggle} value="f">
        Female
      </Toggle>
    </ToggleGroup>
  );
}
