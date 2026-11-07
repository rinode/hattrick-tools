import type { JSX } from "react";
import { ToggleGroup } from "@base-ui/react/toggle-group";
import { Toggle } from "@base-ui/react/toggle";
import styles from "./SkinSwatches.module.css";

export interface ToneSwatch {
  code: string;
  hex: string;
}

/** A single-select grid of skin-tone swatches (Base UI ToggleGroup). */
export function SkinSwatches({
  tones,
  value,
  onChange,
}: {
  tones: ToneSwatch[];
  value: string;
  onChange: (code: string) => void;
}): JSX.Element {
  return (
    <ToggleGroup
      className={styles.swatches}
      value={[value]}
      onValueChange={(groupValue) => {
        const next = (groupValue as string[]).find((v) => v !== value);
        if (next) onChange(next);
      }}
    >
      {tones.map((t) => (
        <Toggle
          key={t.code}
          value={t.code}
          className={styles.swatch}
          style={{ background: t.hex }}
          title={`${t.code} · ${t.hex}`}
          aria-label={`Skin tone ${t.code}`}
        />
      ))}
    </ToggleGroup>
  );
}
