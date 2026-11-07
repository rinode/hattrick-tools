import type { JSX } from "react";
import styles from "./Swatch.module.css";

/** A square colour-picker swatch. */
export function Swatch({
  value,
  onChange,
  small = false,
  title,
}: {
  value: string;
  onChange: (hex: string) => void;
  small?: boolean;
  title?: string;
}): JSX.Element {
  return (
    <input
      type="color"
      title={title}
      className={small ? `${styles.swatch} ${styles.sm}` : styles.swatch}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
