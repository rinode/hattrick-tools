import type { JSX } from "react";
import styles from "./ExportTab.module.css";

export function ExportTab({
  onExport,
  status,
}: {
  onExport: () => void;
  status: string;
}): JSX.Element {
  return (
    <>
      <button type="button" onClick={onExport}>
        PNG
      </button>
      <div className={styles.status}>{status}</div>
    </>
  );
}
