import type { JSX } from "react";
import { Check } from "hattrick-ui";

export function ShowTab({
  showName,
  setShowName,
  showNames,
  setShowNames,
  showStairs,
  setShowStairs,
}: {
  showName: boolean;
  setShowName: (v: boolean) => void;
  showNames: boolean;
  setShowNames: (v: boolean) => void;
  showStairs: boolean;
  setShowStairs: (v: boolean) => void;
}): JSX.Element {
  return (
    <>
      <Check label="Team name" checked={showName} onChange={setShowName} />
      <Check label="Player names" checked={showNames} onChange={setShowNames} />
      <Check label="Stairs" checked={showStairs} onChange={setShowStairs} />
    </>
  );
}
