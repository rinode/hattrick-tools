import type { JSX } from "react";
import {
  Collapsible,
  GenderToggle,
  type Gender,
  PartPicker,
  type PickerOption,
  SkinSwatches,
  type ToneSwatch,
} from "hattrick-ui";
import styles from "./AppearanceTab.module.css";

export interface PartData {
  key: string;
  label: string;
  value: string;
  options: PickerOption[];
}

export function AppearanceTab({
  gender,
  onGender,
  tones,
  tone,
  onTone,
  onRandomize,
  parts,
  onChoose,
}: {
  gender: Gender;
  onGender: (g: Gender) => void;
  tones: ToneSwatch[];
  tone: string;
  onTone: (t: string) => void;
  onRandomize: () => void;
  parts: PartData[];
  onChoose: (key: string, value: string) => void;
}): JSX.Element {
  return (
    <>
      <Collapsible title="Gender & skin">
        <label>Gender</label>
        <GenderToggle value={gender} onChange={onGender} />
        <label>Skin tone (sets face variant + body colour)</label>
        <SkinSwatches tones={tones} value={tone} onChange={onTone} />
      </Collapsible>

      <Collapsible title="Parts">
        <button type="button" className="secondary" onClick={onRandomize}>
          Randomize
        </button>
        <div className={styles.pickers}>
          {parts.map((p) => (
            <PartPicker
              key={p.key}
              label={p.label}
              value={p.value}
              options={p.options}
              onChange={(v) => onChoose(p.key, v)}
            />
          ))}
        </div>
      </Collapsible>
    </>
  );
}
