import type { JSX } from "react";
import { Select, type SelectOption } from "hattrick-ui";
import { UploadList } from "./UploadList.js";

const KIT_OPTS: SelectOption[] = [
  { value: "home", label: "Home" },
  { value: "away", label: "Away" },
  { value: "default", label: "Hattrick default" },
  { value: "blank", label: "Blank" },
];

export function KitsTab(props: {
  playersKit: string;
  setPlayersKit: (v: string) => void;
  keepersKit: string;
  setKeepersKit: (v: string) => void;
  staffKit: string;
  setStaffKit: (v: string) => void;
  customKits: Record<string, string>;
  onKitUpload: (files: FileList | null) => void;
  onRemoveKit: (name: string) => void;
}): JSX.Element {
  const opts: SelectOption[] = [
    ...KIT_OPTS,
    ...Object.keys(props.customKits).map((n) => ({ value: `upload:${n}`, label: `Uploaded: ${n}` })),
  ];
  return (
    <>
      <label>Players kit</label>
      <Select value={props.playersKit} onChange={props.setPlayersKit} options={opts} />
      <label>Keepers kit</label>
      <Select value={props.keepersKit} onChange={props.setKeepersKit} options={opts} />
      <label>Staff kit</label>
      <Select value={props.staffKit} onChange={props.setStaffKit} options={opts} />
      <label>Upload kits</label>
      <input
        type="file"
        accept=".json,application/json"
        multiple
        onChange={(e) => props.onKitUpload(e.target.files)}
      />
      <UploadList
        items={Object.keys(props.customKits).map((n) => ({
          name: n,
          onRemove: () => props.onRemoveKit(n),
        }))}
      />
    </>
  );
}
