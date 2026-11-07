import { type JSX, useEffect, useRef, useState } from "react";
import { ensurePreview } from "./fonts.js";

/** A filtering font dropdown: type to search, click or Enter to pick. Each row
 *  previews in its own font, loaded lazily as it scrolls into view. */
export function FontCombo({
  value,
  fonts,
  onPick,
}: {
  value: string;
  fonts: string[];
  onPick: (family: string) => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);

  const shown = (
    query ? fonts.filter((n) => n.toLowerCase().includes(query.toLowerCase())) : fonts
  ).slice(0, 300);

  // Lazy-load a preview font for each visible row.
  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    if (!list) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          const name = (e.target as HTMLElement).dataset.font;
          if (name) ensurePreview(name);
          io.unobserve(e.target);
        }
      },
      { root: list },
    );
    for (const row of list.querySelectorAll(".combo-item")) io.observe(row);
    return () => io.disconnect();
  }, [open, shown.length]);

  function choose(name: string): void {
    onPick(name);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  return (
    <div className="combo">
      <input
        className="combo-input"
        autoComplete="off"
        spellCheck={false}
        value={open ? query : value}
        placeholder={value}
        style={{ fontFamily: `"${value}", Verdana, sans-serif` }}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(-1);
        }}
        onKeyDown={(e) => {
          if (!open) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => Math.min(a + 1, shown.length - 1));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => Math.max(a - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            choose((active >= 0 ? shown[active] : undefined) ?? value);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      <div className="combo-list" ref={listRef} hidden={!open}>
        {shown.length === 0 ? (
          <div className="combo-empty">No fonts</div>
        ) : (
          shown.map((name, i) => (
            <div
              key={name}
              className={`combo-item${i === active ? " active" : ""}`}
              data-font={name}
              style={{ fontFamily: `"${name}", Verdana, sans-serif` }}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(name);
              }}
            >
              {name}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
