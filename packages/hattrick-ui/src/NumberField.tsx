import type { JSX } from "react";
import { NumberField as Base } from "@base-ui/react/number-field";
import styles from "./NumberField.module.css";

/** A labelled number input (Base UI NumberField). */
export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}): JSX.Element {
  return (
    <>
      <label>{label}</label>
      <Base.Root value={value} onValueChange={(v) => onChange(v ?? 0)} min={min} max={max}>
        <Base.Group>
          <Base.Input className={styles.input} />
        </Base.Group>
      </Base.Root>
    </>
  );
}
