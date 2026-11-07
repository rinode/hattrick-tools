import type { JSX } from "react";
import { Check, Collapsible, Select, Slider, Swatch } from "hattrick-ui";
import { UploadList } from "./UploadList.js";

const FIT = [
  { value: "cover", label: "Cover" },
  { value: "contain", label: "Contain" },
  { value: "stretch", label: "Stretch" },
  { value: "tile", label: "Tile" },
];
const POS = [
  "center", "top", "bottom", "left", "right",
  "top-left", "top-right", "bottom-left", "bottom-right",
].map((p) => ({ value: p, label: p.replace("-", " ").replace(/^\w/, (c) => c.toUpperCase()) }));

export function BackgroundTab(props: {
  bgColor: string;
  setBgColor: (v: string) => void;
  bgAlpha: number;
  setBgAlpha: (n: number) => void;
  showBg: boolean;
  setShowBg: (v: boolean) => void;
  onUpload: (file: File | undefined) => void;
  bgName: string;
  onRemove: () => void;
  bgFit: string;
  setBgFit: (v: string) => void;
  bgPosition: string;
  setBgPosition: (v: string) => void;
}): JSX.Element {
  return (
    <>
      <Collapsible title="Colour">
        <label>Colour</label>
        <Swatch value={props.bgColor} onChange={props.setBgColor} />
        <Slider label="Opacity" value={props.bgAlpha} onChange={props.setBgAlpha} min={0} max={100} suffix="%" />
      </Collapsible>

      <Collapsible title="Image">
        <Check label="Show image" checked={props.showBg} onChange={props.setShowBg} />
        <label>Image</label>
        <input type="file" accept="image/*" onChange={(e) => props.onUpload(e.target.files?.[0])} />
        <UploadList items={props.bgName ? [{ name: props.bgName, onRemove: props.onRemove }] : []} />
        <label>Image fit</label>
        <Select value={props.bgFit} onChange={props.setBgFit} options={FIT} />
        <label>Image position</label>
        <Select value={props.bgPosition} onChange={props.setBgPosition} options={POS} />
      </Collapsible>
    </>
  );
}
