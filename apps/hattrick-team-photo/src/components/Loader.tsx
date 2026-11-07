import type { JSX } from "react";
import styles from "./Loader.module.css";

/** A spinner with an "n/total" count. Rendered as stable JSX so the spin
 *  animation keeps running as the count updates (it never remounts). */
export function Loader({ n, total }: { n: number; total: number }): JSX.Element {
  return (
    <div className={styles.loader}>
      <div className={styles.wrap}>
        <div className={styles.spinner} />
        <div className={styles.count}>
          {n}/{total}
        </div>
      </div>
    </div>
  );
}
