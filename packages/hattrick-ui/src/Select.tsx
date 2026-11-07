import type { JSX } from "react";
import { Select as Base } from "@base-ui/react/select";
import styles from "./Select.module.css";

export interface SelectOption {
  value: string;
  label: string;
}

/** A styled dropdown select (Base UI Select). */
export function Select({
  value,
  onChange,
  options,
  compact = false,
  title,
}: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  compact?: boolean;
  title?: string;
}): JSX.Element {
  return (
    <Base.Root value={value} onValueChange={(v) => onChange(v as string)}>
      <Base.Trigger className={compact ? styles.triggerCompact : styles.trigger} title={title}>
        <Base.Value>
          {(val) => options.find((o) => o.value === val)?.label ?? String(val ?? "")}
        </Base.Value>
        <Base.Icon className={styles.icon}>▾</Base.Icon>
      </Base.Trigger>
      <Base.Portal>
        <Base.Positioner className={styles.positioner} sideOffset={4}>
          <Base.Popup className={styles.popup}>
            {options.map((o) => (
              <Base.Item key={o.value} value={o.value} className={styles.item}>
                <Base.ItemText>{o.label}</Base.ItemText>
              </Base.Item>
            ))}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}
