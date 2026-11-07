import type { JSX } from "react";
import { Select, Slider, Swatch } from "hattrick-ui";
import { FontCombo } from "../FontCombo.js";
import { variantsFor } from "../fonts.js";
import { UploadList } from "./UploadList.js";
import styles from "./TextTab.module.css";

export function TextTab(props: {
  allFonts: string[];
  headerFont: string;
  onHeaderFont: (f: string) => void;
  headerStyle: string;
  onHeaderStyle: (v: string) => void;
  headerSize: number;
  setHeaderSize: (n: number) => void;
  headerColor: string;
  setHeaderColor: (v: string) => void;
  namesFont: string;
  onNamesFont: (f: string) => void;
  namesStyle: string;
  onNamesStyle: (v: string) => void;
  namesSize: number;
  setNamesSize: (n: number) => void;
  namesColor: string;
  setNamesColor: (v: string) => void;
  fontUploads: { name: string; onRemove: () => void }[];
  onFontUpload: (files: FileList | null) => void;
}): JSX.Element {
  const styleOpts = (family: string) =>
    variantsFor(family).map((v) => ({ value: v.value, label: v.label }));
  return (
    <>
      <label>Team name font</label>
      <div className={styles.row}>
        <div className={styles.combo}>
          <FontCombo value={props.headerFont} fonts={props.allFonts} onPick={props.onHeaderFont} />
        </div>
        <Swatch small value={props.headerColor} onChange={props.setHeaderColor} />
      </div>
      <Select value={props.headerStyle} onChange={props.onHeaderStyle} options={styleOpts(props.headerFont)} />
      <Slider label="Size" value={props.headerSize} onChange={props.setHeaderSize} min={28} max={80} />

      <label>Player names font</label>
      <div className={styles.row}>
        <div className={styles.combo}>
          <FontCombo value={props.namesFont} fonts={props.allFonts} onPick={props.onNamesFont} />
        </div>
        <Swatch small value={props.namesColor} onChange={props.setNamesColor} />
      </div>
      <Select value={props.namesStyle} onChange={props.onNamesStyle} options={styleOpts(props.namesFont)} />
      <Slider label="Size" value={props.namesSize} onChange={props.setNamesSize} min={10} max={24} />

      <label>Upload fonts</label>
      <input
        type="file"
        accept=".ttf,.otf,.woff,.woff2"
        multiple
        onChange={(e) => props.onFontUpload(e.target.files)}
      />
      <UploadList items={props.fontUploads} />
    </>
  );
}
