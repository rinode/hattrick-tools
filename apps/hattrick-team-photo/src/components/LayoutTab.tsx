import type { JSX } from "react";
import { Check, Slider, Swatch } from "hattrick-ui";

export function LayoutTab({
  rows,
  setRows,
  maxRows,
  stairH,
  setStairH,
  stairTop,
  setStairTop,
  stairFront,
  setStairFront,
  stagger,
  setStagger,
}: {
  rows: number;
  setRows: (n: number) => void;
  maxRows: number;
  stairH: number;
  setStairH: (n: number) => void;
  stairTop: string;
  setStairTop: (v: string) => void;
  stairFront: string;
  setStairFront: (v: string) => void;
  stagger: boolean;
  setStagger: (v: boolean) => void;
}): JSX.Element {
  return (
    <>
      <Slider label="Rows" value={rows} onChange={setRows} min={1} max={maxRows} />
      <Slider label="Row height" value={stairH} onChange={setStairH} min={20} max={90} />
      <label>Step top colour</label>
      <Swatch value={stairTop} onChange={setStairTop} />
      <label>Step front colour</label>
      <Swatch value={stairFront} onChange={setStairFront} />
      <Check label="Stagger rows" checked={stagger} onChange={setStagger} />
    </>
  );
}
