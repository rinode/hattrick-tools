import { type JSX, useMemo, useRef, useState } from "react";
import {
  AppShell,
  GenderToggle,
  PartPicker,
  type PickerOption,
  SkinSwatches,
  Tabs,
} from "hattrick-ui";
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
  const pickers = cfgs.map((cfg) => {
    if (cfg.key === FACE) {
      const options: PickerOption[] = shapes.map((s) => ({
        value: s,
        label: `shape ${s}`,
        thumbUrl: optionThumbUrl(BASE, gender, cfg, tone, s),
      }));
      return { cfg, value: shape, options };
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
    return { cfg, value, options };
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

  const appearance = (
    <>
      <label>Gender</label>
      <GenderToggle value={gender} onChange={switchGender} />

      <label>Skin tone (sets face variant + body colour)</label>
      <SkinSwatches
        tones={tones.order.map((code) => ({ code, hex: tones.hex[code] ?? "#000" }))}
        value={tone}
        onChange={setTone}
      />

      <label>Parts</label>
      <button type="button" className="secondary" onClick={randomize}>
        Randomize
      </button>
      <div className="picker">
        {pickers.map(({ cfg, value, options }) => (
          <PartPicker
            key={cfg.key}
            label={cfg.label}
            value={value}
            options={options}
            onChange={(v) => choose(cfg.key, v)}
          />
        ))}
      </div>
    </>
  );

  const body = (
    <>
      <label>Body type (1-12)</label>
      <div className="picker">
        <PartPicker
          label="Body type"
          value={String(bodyType)}
          options={bodyOptions}
          onChange={(v) => setBodyType(Number(v))}
        />
      </div>

      <label htmlFor="width">Width (px)</label>
      <input
        id="width"
        type="number"
        min={40}
        max={800}
        value={width}
        onChange={(e) => setWidth(Number(e.target.value))}
      />

      <div className="row">
        <div>
          <label htmlFor="neckPosition">Neck position</label>
          <input
            id="neckPosition"
            type="number"
            value={neckPosition}
            onChange={(e) => setNeckPosition(Number(e.target.value))}
          />
        </div>
        <div>
          <label htmlFor="hairOffsetX">Hair offset X</label>
          <input
            id="hairOffsetX"
            type="number"
            value={hairOffsetX}
            onChange={(e) => setHairOffsetX(Number(e.target.value))}
          />
        </div>
      </div>

      <label htmlFor="hairOffsetY">Hair offset Y</label>
      <input
        id="hairOffsetY"
        type="number"
        value={hairOffsetY}
        onChange={(e) => setHairOffsetY(Number(e.target.value))}
      />

      <label htmlFor="kitJson">Kit JSON URL (optional)</label>
      <input
        id="kitJson"
        type="text"
        value={kitJson}
        onChange={(e) => setKitJson(e.target.value)}
      />
    </>
  );

  const exportTab = (
    <>
      <button type="button" className="secondary" onClick={exportPng}>
        PNG
      </button>
      <div id="status">{status}</div>
    </>
  );

  return (
    <AppShell
      title="Player Renderer"
      controls={
        <Tabs
          tabs={[
            { id: "appearance", label: "Appearance", content: appearance },
            { id: "body", label: "Body & layout", content: body },
            { id: "export", label: "Export", content: exportTab },
          ]}
        />
      }
    >
      <div id="stage" className="panel">
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
          onError={(err) =>
            setStatus("Error: " + (err instanceof Error ? err.message : String(err)))
          }
        />
      </div>
    </AppShell>
  );
}
