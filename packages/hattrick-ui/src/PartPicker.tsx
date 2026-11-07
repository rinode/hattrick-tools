import { type JSX, useState } from "react";
import { Popover } from "@base-ui/react/popover";
import { ThumbTile } from "./ThumbTile.js";
import styles from "./PartPicker.module.css";

export interface PickerOption {
  value: string;
  label: string;
  thumbUrl?: string;
}

export interface PartPickerProps {
  label: string;
  /** The selected option value. */
  value: string;
  options: PickerOption[];
  onChange: (value: string) => void;
}

/**
 * A control showing the current selection; clicking it opens a floating,
 * scrollable grid of option thumbnails. Anchoring, viewport-clamping,
 * outside-press and Escape are handled by Base UI's Popover; picking an option
 * closes it.
 */
export function PartPicker({ label, value, options, onChange }: PartPickerProps): JSX.Element {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <div className={styles.item}>
      <div className={styles.head}>
        <span>{label}</span>
        <span className={styles.cur}>{current?.label ?? "none"}</span>
      </div>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger className={styles.trigger}>
          <ThumbTile url={current?.thumbUrl} alt={current?.label ?? "none"} />
          <span className={styles.chev} aria-hidden>
            ▾
          </span>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner
            className={styles.positioner}
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
          >
            <Popover.Popup className={styles.popup}>
              <div className={styles.grid} role="listbox" aria-label={label}>
                {options.map((o) => (
                  <button
                    key={o.value}
                    type="button"
                    role="option"
                    className={styles.cell}
                    aria-selected={o.value === value}
                    title={o.label}
                    onClick={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                  >
                    <ThumbTile url={o.thumbUrl} alt={o.label} />
                  </button>
                ))}
              </div>
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
