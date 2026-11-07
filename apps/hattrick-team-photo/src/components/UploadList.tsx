import type { JSX } from "react";

/** A list of uploaded files, each with a delete cross. Uses the theme's
 *  global .uploads/.upload-item classes. */
export function UploadList({
  items,
}: {
  items: { name: string; onRemove: () => void }[];
}): JSX.Element | null {
  if (!items.length) return null;
  return (
    <div className="uploads">
      {items.map((it) => (
        <div className="upload-item" key={it.name}>
          <span className="name">{it.name}</span>
          <button
            type="button"
            className="upload-del"
            aria-label={`Remove ${it.name}`}
            onClick={it.onRemove}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
