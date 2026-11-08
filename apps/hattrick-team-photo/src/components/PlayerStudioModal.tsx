import { type JSX, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { NumberField, Tabs } from "hattrick-ui";
import { type RendererOptions } from "hattrick-player-renderer";
import { AvatarFigure } from "hattrick-player-renderer-react";
import {
  AppearanceTab,
  BodyTab,
  deriveStudio,
  FACE,
  type Gender,
  optionsFor,
  partsFor,
  type StudioState,
  toneTable,
} from "hattrick-studio";
import styles from "./PlayerStudioModal.module.css";

const randOf = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

/** A player's full override: shirt name, number and the studio style. */
export interface PlayerOverride {
  name: string;
  number: number;
  style: StudioState;
}

/**
 * Full player-renderer studio for one squad member, over the stage. Edits a
 * draft override (name, number and studio style) with a live preview; Apply
 * commits it, Reset clears any override (back to the real avatar), Cancel
 * discards.
 */
export function PlayerStudioModal({
  base,
  engine,
  initial,
  hasOverride,
  onApply,
  onReset,
  onClose,
}: {
  base: string;
  engine: RendererOptions;
  initial: PlayerOverride;
  hasOverride: boolean;
  onApply: (override: PlayerOverride) => void;
  onReset: () => void;
  onClose: () => void;
}): JSX.Element {
  const [name, setName] = useState(initial.name);
  const [number, setNumber] = useState(initial.number);
  const [draft, setDraft] = useState<StudioState>(initial.style);
  const patch = (p: Partial<StudioState>): void => setDraft((d) => ({ ...d, ...p }));

  const { shape, shapes, tones, parts, inputs, bodyOptions } = deriveStudio(draft, base);
  const cfgs = partsFor(draft.gender);

  function switchGender(g: Gender): void {
    patch({ gender: g, tone: toneTable(g).order[0] ?? "a", shapeIdx: 0, sel: {} });
  }
  function randomize(): void {
    const newShapeIdx = Math.floor(Math.random() * shapes.length);
    const newShape = shapes[newShapeIdx] ?? shape;
    const sel: Record<string, string> = {};
    for (const cfg of cfgs) {
      if (cfg.key === FACE) continue;
      const pool = cfg.optional
        ? ["", ...optionsFor(draft.gender, newShape, cfg)]
        : optionsFor(draft.gender, newShape, cfg);
      if (pool.length) sel[cfg.key] = randOf(pool) ?? "";
    }
    patch({ tone: randOf(tones.order) ?? draft.tone, shapeIdx: newShapeIdx, sel });
  }
  function choose(key: string, value: string): void {
    if (key === FACE) patch({ shapeIdx: Math.max(0, shapes.indexOf(value)) });
    else setDraft((d) => ({ ...d, sel: { ...d.sel, [key]: value } }));
  }

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Backdrop className={styles.backdrop} />
        <Dialog.Popup className={styles.popup}>
          <div className={styles.head}>
            <Dialog.Title className={styles.title}>
              Style · {number ? `${number}. ${name}` : name}
            </Dialog.Title>
            <Dialog.Close className={styles.x} aria-label="Close">
              ✕
            </Dialog.Close>
          </div>

          <div className={styles.idFields}>
            <label className={styles.nameField}>
              <span>Name</span>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className={styles.numberField}>
              <NumberField label="Number" value={number} onChange={setNumber} min={0} max={999} />
            </div>
          </div>

          <div className={styles.body}>
            <div className={styles.preview}>
              <AvatarFigure inputs={inputs} engine={engine} className={styles.fig} />
            </div>
            <div className={styles.controls}>
              <Tabs
                storageKey="ht-team-photo-studio-tab"
                tabs={[
                  {
                    id: "appearance",
                    label: "Appearance",
                    content: (
                      <AppearanceTab
                        gender={draft.gender}
                        onGender={switchGender}
                        tones={tones.order.map((code) => ({
                          code,
                          hex: tones.hex[code] ?? "#000",
                        }))}
                        tone={draft.tone}
                        onTone={(t) => patch({ tone: t })}
                        onRandomize={randomize}
                        parts={parts}
                        onChoose={choose}
                      />
                    ),
                  },
                  {
                    id: "body",
                    label: "Body & layout",
                    content: (
                      <BodyTab
                        bodyValue={String(draft.bodyType)}
                        bodyOptions={bodyOptions}
                        onBody={(v) => patch({ bodyType: Number(v) })}
                        width={draft.width}
                        setWidth={(n) => patch({ width: n })}
                        neck={draft.neckPosition}
                        setNeck={(n) => patch({ neckPosition: n })}
                        hairX={draft.hairOffsetX}
                        setHairX={(n) => patch({ hairOffsetX: n })}
                        hairY={draft.hairOffsetY}
                        setHairY={(n) => patch({ hairOffsetY: n })}
                        kitJson={draft.kitJson}
                        setKitJson={(v) => patch({ kitJson: v })}
                      />
                    ),
                  },
                ]}
              />
            </div>
          </div>

          <div className={styles.foot}>
            <button
              type="button"
              className={styles.reset}
              disabled={!hasOverride}
              onClick={onReset}
            >
              Reset
            </button>
            <button type="button" className={styles.cancel} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={styles.apply}
              onClick={() => onApply({ name, number, style: draft })}
            >
              Apply
            </button>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
