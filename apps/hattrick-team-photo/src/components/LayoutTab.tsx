import type { JSX } from "react";
import { Check, Collapsible, Slider, Swatch } from "hattrick-ui";

export function LayoutTab({
  rows,
  setRows,
  maxRows,
  stagger,
  setStagger,
  showStairs,
  setShowStairs,
  stairH,
  setStairH,
  stairTop,
  setStairTop,
  stairFront,
  setStairFront,
}: {
  rows: number;
  setRows: (n: number) => void;
  maxRows: number;
  stagger: boolean;
  setStagger: (v: boolean) => void;
  showStairs: boolean;
  setShowStairs: (v: boolean) => void;
  stairH: number;
  setStairH: (n: number) => void;
  stairTop: string;
  setStairTop: (v: string) => void;
  stairFront: string;
  setStairFront: (v: string) => void;
}): JSX.Element {
  return (
    <>
      <Collapsible title="Rows">
        <Slider label="Rows" value={rows} onChange={setRows} min={1} max={maxRows} />
        <Check label="Stagger rows" checked={stagger} onChange={setStagger} />
      </Collapsible>
      <Collapsible title="Stairs">
        <Check label="Show stairs" checked={showStairs} onChange={setShowStairs} />
        <Slider label="Row height" value={stairH} onChange={setStairH} min={20} max={90} />
        <label>Step top colour</label>
        <Swatch value={stairTop} onChange={setStairTop} />
        <label>Step front colour</label>
        <Swatch value={stairFront} onChange={setStairFront} />
      </Collapsible>
    </>
  );
}
