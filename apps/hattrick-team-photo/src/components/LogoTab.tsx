import type { JSX } from "react";
import { Check, Slider } from "hattrick-ui";
import { UploadList } from "./UploadList.js";

/** The "Logo (top left)" / "Logo (top right)" tab — badge or crest. */
export function LogoTab(props: {
  showLabel: string;
  imageLabel: string;
  show: boolean;
  setShow: (v: boolean) => void;
  onUpload: (file: File | undefined) => void;
  name: string;
  onRemove: () => void;
  scale: number;
  setScale: (n: number) => void;
  scaleMin: number;
  scaleMax: number;
  shadow: boolean;
  setShadow: (v: boolean) => void;
}): JSX.Element {
  return (
    <>
      <Check label={props.showLabel} checked={props.show} onChange={props.setShow} />
      <label>{props.imageLabel}</label>
      <input type="file" accept="image/*" onChange={(e) => props.onUpload(e.target.files?.[0])} />
      <UploadList items={props.name ? [{ name: props.name, onRemove: props.onRemove }] : []} />
      <Slider label="Size" value={props.scale} onChange={props.setScale} min={props.scaleMin} max={props.scaleMax} suffix="%" />
      <Check label="Drop shadow" checked={props.shadow} onChange={props.setShadow} />
    </>
  );
}
