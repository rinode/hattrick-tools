import type { JSX } from "react";
import { NumberField, PartPicker, type PickerOption } from "hattrick-ui";
import styles from "./BodyTab.module.css";

export function BodyTab({
  bodyValue,
  bodyOptions,
  onBody,
  width,
  setWidth,
  neck,
  setNeck,
  hairX,
  setHairX,
  hairY,
  setHairY,
  kitJson,
  setKitJson,
}: {
  bodyValue: string;
  bodyOptions: PickerOption[];
  onBody: (v: string) => void;
  width: number;
  setWidth: (n: number) => void;
  neck: number;
  setNeck: (n: number) => void;
  hairX: number;
  setHairX: (n: number) => void;
  hairY: number;
  setHairY: (n: number) => void;
  kitJson: string;
  setKitJson: (v: string) => void;
}): JSX.Element {
  return (
    <>
      <label>Body type (1-12)</label>
      <div className={styles.pickers}>
        <PartPicker label="Body type" value={bodyValue} options={bodyOptions} onChange={onBody} />
      </div>

      <NumberField label="Width (px)" value={width} onChange={setWidth} min={40} max={800} />

      <div className={styles.row}>
        <div>
          <NumberField label="Neck position" value={neck} onChange={setNeck} />
        </div>
        <div>
          <NumberField label="Hair offset X" value={hairX} onChange={setHairX} />
        </div>
      </div>

      <NumberField label="Hair offset Y" value={hairY} onChange={setHairY} />

      <label htmlFor="kitJson">Kit JSON URL (optional)</label>
      <input id="kitJson" type="text" value={kitJson} onChange={(e) => setKitJson(e.target.value)} />
    </>
  );
}
