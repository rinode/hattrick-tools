import type { JSX } from "react";
import styles from "./ThumbTile.module.css";

export interface ThumbTileProps {
  /** Image URL, or empty/undefined for a "none" tile. */
  url?: string;
  alt: string;
}

/** A checkerboard-backed thumbnail tile; shows nothing (transparent) when url is empty. */
export function ThumbTile({ url, alt }: ThumbTileProps): JSX.Element {
  return (
    <span className={styles.thumb}>
      {url ? <img className={styles.img} src={url} alt={alt} loading="lazy" /> : null}
    </span>
  );
}
