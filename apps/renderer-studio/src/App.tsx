import { type JSX, useMemo, useRef, useState } from "react";
import { AppShell, type PickerOption, Tabs } from "hattrick-ui";
import { AvatarFigure } from "hattrick-player-renderer-react";
import { BODY_TYPES, type RenderOutput } from "hattrick-player-renderer";
import {
  assetPathsForBody,
  FACE,
  faceShapes,
  type Gender,
  gatherInputs,
  optionLabel,
  optionsFor,
  optionThumbUrl,
  partsFor,
  toneTable,
} from "./studio-model.js";
import { AppearanceTab, type PartData } from "./components/AppearanceTab.js";
import { BodyTab } from "./components/BodyTab.js";
import { ExportTab } from "./components/ExportTab.js";
import styles from "./App.module.css";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const ENGINE = {
  slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
  fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
  assetOrigin: location.origin + BASE,
};

const randOf = <T,>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

export function App(): JSX.Element {
  const [gender, setGender] = useState<Gender>("m");
  const [tone, setTone] = useState("c");
  const [shapeIdx, setShapeIdx] = useState(0);
  const [sel, setSel] = useState<Record<string, string>>({});
  const [bodyType, setBodyType] = useState(10);
  const [width, setWidth] = useState(240);
  const [neckPosition, setNeckPosition] = useState(87);
  const [hairOffsetX, setHairOffsetX] = useState(0);
  const [hairOffsetY, setHairOffsetY] = useState(0);
  const [kitJson, setKitJson] = useState("/default-kit.json");
  const [status, setStatus] = useState("");

  const lastOutput = useRef<RenderOutput | null>(null);

  const tones = toneTable(gender);
  const shapes = faceShapes(gender);
  const shape = shapes[Math.min(shapeIdx, shapes.length - 1)] ?? "1";
  const cfgs = partsFor(gender);

  // Effective selection (fall back to a valid default) + the picker option lists.
  const effSel: Record<string, string> = {};
  const parts: PartData[] = cfgs.map((cfg) => {
    if (cfg.key === FACE) {
      return {
        key: cfg.key,
        label: cfg.label,
        value: shape,
        options: shapes.map((sVal) => ({
          value: sVal,
          label: `shape ${sVal}`,
          thumbUrl: optionThumbUrl(BASE, gender, cfg, tone, sVal),
        })),
      };
    }
    const files = optionsFor(gender, shape, cfg);
    const raw = sel[cfg.key];
    const valid = raw === "" ? cfg.optional : raw !== undefined && files.includes(raw);
    const value = valid ? (raw as string) : cfg.optional ? "" : (files[0] ?? "");
    effSel[cfg.key] = value;
    const options: PickerOption[] = [
      ...(cfg.optional ? [{ value: "", label: "none" } as PickerOption] : []),
      ...files.map((f) => ({
        value: f,
        label: optionLabel(cfg, f),
        thumbUrl: optionThumbUrl(BASE, gender, cfg, tone, f),
      })),
    ];
    return { key: cfg.key, label: cfg.label, value, options };
  });

  const inputs = gatherInputs(
    { gender, tone, shape, sel: effSel },
    { bodyType, width, neckPosition, hairOffsetX, hairOffsetY, kitJson },
  );

  const bodyOptions: PickerOption[] = useMemo(
    () =>
      BODY_TYPES.map((n) => ({
        value: String(n),
        label: `body ${n}`,
        thumbUrl: assetPathsForBody(n, BASE).outlinePath,
      })),
    [],
  );

  function switchGender(g: Gender): void {
    setGender(g);
    setTone(toneTable(g).order[0] ?? "a");
    setShapeIdx(0);
    setSel({});
  }

  function randomize(): void {
    const newShapeIdx = Math.floor(Math.random() * shapes.length);
    const newShape = shapes[newShapeIdx] ?? shape;
    setTone(randOf(tones.order) ?? tone);
    setShapeIdx(newShapeIdx);
    const next: Record<string, string> = {};
    for (const cfg of cfgs) {
      if (cfg.key === FACE) continue;
      const pool = cfg.optional
        ? ["", ...optionsFor(gender, newShape, cfg)]
        : optionsFor(gender, newShape, cfg);
      if (pool.length) next[cfg.key] = randOf(pool) ?? "";
    }
    setSel(next);
  }

  function choose(key: string, value: string): void {
    if (key === FACE) setShapeIdx(Math.max(0, shapes.indexOf(value)));
    else setSel((prev) => ({ ...prev, [key]: value }));
  }

  function exportPng(): void {
    const out = lastOutput.current;
    if (!out) {
      setStatus("Nothing to export yet.");
      return;
    }
    const link = document.createElement("a");
    link.download = "player.png";
    link.href = out instanceof HTMLCanvasElement ? out.toDataURL("image/png") : out.src;
    link.click();
  }

  return (
    <AppShell
      title="Player Renderer"
      controls={
        <Tabs
          tabs={[
            {
              id: "appearance",
              label: "Appearance",
              content: (
                <AppearanceTab
                  gender={gender}
                  onGender={switchGender}
                  tones={tones.order.map((code) => ({ code, hex: tones.hex[code] ?? "#000" }))}
                  tone={tone}
                  onTone={setTone}
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
                  bodyValue={String(bodyType)}
                  bodyOptions={bodyOptions}
                  onBody={(v) => setBodyType(Number(v))}
                  width={width}
                  setWidth={setWidth}
                  neck={neckPosition}
                  setNeck={setNeckPosition}
                  hairX={hairOffsetX}
                  setHairX={setHairOffsetX}
                  hairY={hairOffsetY}
                  setHairY={setHairOffsetY}
                  kitJson={kitJson}
                  setKitJson={setKitJson}
                />
              ),
            },
            { id: "export", label: "Export", content: <ExportTab onExport={exportPng} status={status} /> },
          ]}
        />
      }
    >
      <div className={styles.stage}>
        <AvatarFigure
          inputs={inputs}
          engine={ENGINE}
          onRendered={(out) => {
            lastOutput.current = out;
            const size =
              out instanceof HTMLCanvasElement
                ? `${out.width}×${out.height}`
                : `${out.naturalWidth}×${out.naturalHeight}`;
            setStatus(`Rendered ${size}.`);
          }}
          onError={(err) => setStatus("Error: " + (err instanceof Error ? err.message : String(err)))}
        />
      </div>
    </AppShell>
  );
}
