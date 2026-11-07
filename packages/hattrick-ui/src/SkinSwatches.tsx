import type { JSX } from "react";
import styles from "./SkinSwatches.module.css";

export interface ToneSwatch {
  code: string;
  hex: string;
}

/** A grid of skin-tone swatches; the selected one is ringed. */
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
    <div className={styles.swatches}>
      {tones.map((t) => (
        <button
          key={t.code}
          type="button"
          className={styles.swatch}
          style={{ background: t.hex }}
          title={`${t.code} · ${t.hex}`}
          aria-label={`Skin tone ${t.code}`}
          aria-pressed={t.code === value}
          onClick={() => onChange(t.code)}
        />
      ))}
    </div>
  );
}
