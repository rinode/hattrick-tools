import type { JSX } from "react";
import { Slider as Base } from "@base-ui/react/slider";
import styles from "./Slider.module.css";

/** A labelled range slider with its current value shown alongside (Base UI Slider). */
export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  suffix = "",
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}): JSX.Element {
  return (
    <Base.Root
      className={styles.root}
      value={value}
      onValueChange={(v) => onChange(typeof v === "number" ? v : (v[0] ?? 0))}
      min={min}
      max={max}
      step={step}
    >
      <div className={styles.head}>
        <Base.Label className={styles.label}>{label}</Base.Label>
        <Base.Value className={styles.val}>
          {(val) => `${Array.isArray(val) ? val[0] : val}${suffix}`}
        </Base.Value>
      </div>
      <Base.Control className={styles.control}>
        <Base.Track className={styles.track}>
          <Base.Indicator className={styles.indicator} />
          <Base.Thumb className={styles.thumb} />
        </Base.Track>
      </Base.Control>
    </Base.Root>
  );
}
