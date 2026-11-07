import { type JSX } from "react";
import { Combobox } from "@base-ui/react/combobox";
import { ensurePreview } from "./fonts.js";
import styles from "./FontCombo.module.css";

/** A filtering font picker (Base UI Combobox). Rows preview in their own font,
 *  loaded on hover; the list is capped so the ~1500-font catalogue stays fast. */
export function FontCombo({
  value,
  fonts,
  onPick,
}: {
  value: string;
  fonts: string[];
  onPick: (family: string) => void;
}): JSX.Element {
  return (
    <Combobox.Root
      items={fonts}
      value={value}
      limit={300}
      onValueChange={(v) => {
        if (typeof v === "string" && v) {
          ensurePreview(v);
          onPick(v);
        }
      }}
    >
      <Combobox.Input
        className={styles.input}
        placeholder={value}
        style={{ fontFamily: `"${value}", Verdana, sans-serif` }}
      />
      <Combobox.Portal>
        <Combobox.Positioner className={styles.positioner} sideOffset={2}>
          <Combobox.Popup className={styles.popup}>
            <Combobox.Empty className={styles.empty}>No fonts</Combobox.Empty>
            <Combobox.List>
              {(item: string) => (
                <Combobox.Item
                  key={item}
                  value={item}
                  className={styles.item}
                  style={{ fontFamily: `"${item}", Verdana, sans-serif` }}
                  onMouseEnter={() => ensurePreview(item)}
                >
                  {item}
                </Combobox.Item>
              )}
            </Combobox.List>
          </Combobox.Popup>
        </Combobox.Positioner>
      </Combobox.Portal>
    </Combobox.Root>
  );
}
