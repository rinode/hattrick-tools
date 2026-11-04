import {
  assetPathsForBody,
  BODY_TYPES,
  renderInputs,
  type AvatarPart,
  type RenderInputs,
  type RenderOutput,
} from "hattrick-player-renderer";
// Hattrick's official avatar component — used here as a live face-part preview
// (it renders the head-and-shoulders card; the full body is slimkit below).
import { defineCustomElements } from "@hattrickltd/hattrick-components/loader";
import faceCatalog from "./face-catalog.json";

defineCustomElements();

// Catalog: category -> filename -> [x, y] offset, plus a `_tones` block with
// the real skin-tone palette baked from the face-base PNGs.
type FaceCatalog = Record<string, Record<string, [number, number]>>;
interface ToneTable {
  order: string[]; // tone codes, light -> dark
  hex: Record<string, string>; // tone code -> representative skin hex
  shapes: Record<string, string[]>; // face shape -> tone codes it ships in
}
const CATALOG = faceCatalog as unknown as FaceCatalog;
const TONES = (faceCatalog as unknown as { _tones: Record<"m" | "f", ToneTable> })._tones;

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

const bodySel = el<HTMLSelectElement>("bodyType");
for (const n of BODY_TYPES) {
  const opt = document.createElement("option");
  opt.value = String(n);
  opt.textContent = `Body ${n}`;
  if (n === 10) opt.selected = true;
  bodySel.appendChild(opt);
}

// ---------------------------------------------------------------------------
// Skin + face-part picker
//
// On Hattrick the face is a baked PNG whose skin tone lives in the filename
// suffix (f<shape><tone>.png), consistent across shapes. The body mesh is then
// tinted to match via `skinColor`. So skin is ONE control here: a tone swatch
// sets the body colour AND selects that tone's face variant (nearest tone a
// given shape actually ships, since not every shape has every tone).
//
// faceElements is a flat array of { url, x, y } with canonical root-relative
// urls (/Img/Avatar/<cat>/<file>) — what slimkit and real Hattrick pages use.
// ---------------------------------------------------------------------------

interface CategoryDef {
  key: string;
  label: string;
}

// The face base is handled by the shape+tone controls, so it is NOT in the
// per-file dropdown list. Order is back (drawn first) to front (drawn last);
// FACE marks where the resolved face base is inserted.
const FACE = "@face";
const MALE_ORDER: Array<CategoryDef | typeof FACE> = [
  FACE,
  { key: "eyes", label: "Eyes" },
  { key: "noses", label: "Nose" },
  { key: "mouths", label: "Mouth" },
  { key: "goatees", label: "Goatee" },
  { key: "beards", label: "Beard" },
  { key: "hair", label: "Hair" },
  { key: "filled_hair", label: "Filled hair" },
];
const FEMALE_ORDER: Array<CategoryDef | typeof FACE> = [
  { key: "hair_f_behind", label: "Hair (behind)" },
  FACE,
  { key: "eyes_f", label: "Eyes" },
  { key: "noses_f", label: "Nose" },
  { key: "mouths_f", label: "Mouth" },
  { key: "hair_f", label: "Hair" },
  { key: "filled_hair_f", label: "Filled hair" },
];

let gender: "m" | "f" = "m";
let selectedTone = "c"; // lightest-ish; reset per gender on load/toggle
const pickerBox = el<HTMLDivElement>("facePicker");
const swatchBox = el<HTMLDivElement>("skinSwatches");
const facesTa = el<HTMLTextAreaElement>("faceElements");

function toneTable(): ToneTable {
  return TONES[gender];
}
function faceBaseCat(): string {
  return gender === "m" ? "faces" : "faces_f";
}
function order(): Array<CategoryDef | typeof FACE> {
  return gender === "m" ? MALE_ORDER : FEMALE_ORDER;
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function hexLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.3 * r + 0.59 * g + 0.11 * b;
}

/** Nearest tone (by luminance) that `shape` actually ships. */
function resolveTone(shape: string, wanted: string): string {
  const t = toneTable();
  const avail = t.shapes[shape] ?? [];
  if (avail.includes(wanted)) return wanted;
  if (!avail.length) return wanted;
  const target = hexLum(t.hex[wanted] ?? "#000000");
  return avail.reduce((best, code) =>
    Math.abs(hexLum(t.hex[code] ?? "#000000") - target) <
    Math.abs(hexLum(t.hex[best] ?? "#000000") - target)
      ? code
      : best,
  );
}

// --- Skin-tone swatches (the single skin control) ---------------------------
function buildToneSwatches(): void {
  swatchBox.replaceChildren();
  const t = toneTable();
  for (const code of t.order) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.tone = code;
    b.style.background = t.hex[code]!;
    b.title = `${code} · ${t.hex[code]}`;
    b.setAttribute("aria-pressed", String(code === selectedTone));
    b.addEventListener("click", () => {
      selectedTone = code;
      for (const child of swatchBox.children) child.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "true");
      assembleFaces();
    });
    swatchBox.appendChild(b);
  }
}

// --- Face shape + part dropdowns --------------------------------------------
function buildPicker(): void {
  pickerBox.replaceChildren();
  for (const entry of order()) {
    if (entry === FACE) {
      const label = document.createElement("label");
      const shapes = Object.keys(toneTable().shapes).sort(naturalSort);
      label.textContent = `Face shape (${shapes.length})`;
      const sel = document.createElement("select");
      sel.dataset.cat = FACE;
      for (const sh of shapes) {
        const opt = document.createElement("option");
        opt.value = sh;
        opt.textContent = `Face ${sh}`;
        sel.appendChild(opt);
      }
      sel.addEventListener("change", assembleFaces);
      pickerBox.appendChild(label);
      pickerBox.appendChild(sel);
      continue;
    }
    const files = Object.keys(CATALOG[entry.key] ?? {}).sort(naturalSort);
    const label = document.createElement("label");
    label.textContent = `${entry.label} (${files.length})`;
    const sel = document.createElement("select");
    sel.dataset.cat = entry.key;
    const none = document.createElement("option");
    none.value = "";
    none.textContent = "— none —";
    sel.appendChild(none);
    for (const file of files) {
      const opt = document.createElement("option");
      opt.value = file;
      opt.textContent = file.replace(/\.png$/i, "");
      sel.appendChild(opt);
    }
    sel.addEventListener("change", assembleFaces);
    pickerBox.appendChild(label);
    pickerBox.appendChild(sel);
  }
}

function applyDefaultSelection(): void {
  const first = (cat: string): string => {
    const files = Object.keys(CATALOG[cat] ?? {}).sort(naturalSort);
    return files[0] ?? "";
  };
  const defaults: Record<string, string> =
    gender === "m"
      ? { eyes: first("eyes"), noses: first("noses"), mouths: first("mouths"), hair: first("hair") }
      : { eyes_f: first("eyes_f"), noses_f: first("noses_f"), mouths_f: first("mouths_f"), hair_f: first("hair_f") };
  for (const sel of pickerBox.querySelectorAll<HTMLSelectElement>("select")) {
    const want = defaults[sel.dataset.cat ?? ""];
    if (want) sel.value = want;
  }
}

/** Read the controls, build faceElements, and sync textarea + preview. */
function assembleFaces(): void {
  const parts: AvatarPart[] = [];
  const faceCat = faceBaseCat();
  for (const entry of order()) {
    if (entry === FACE) {
      const shapeSel = pickerBox.querySelector<HTMLSelectElement>(`select[data-cat="${FACE}"]`);
      const shape = shapeSel?.value;
      if (!shape) continue;
      const tone = resolveTone(shape, selectedTone);
      const file = `f${shape}${tone}.png`;
      const off = CATALOG[faceCat]?.[file] ?? [5, 5];
      parts.push({ url: `/Img/Avatar/${faceCat}/${file}`, x: off[0], y: off[1] });
      continue;
    }
    const sel = pickerBox.querySelector<HTMLSelectElement>(`select[data-cat="${entry.key}"]`);
    const file = sel?.value;
    if (!file) continue;
    const off = CATALOG[entry.key]?.[file] ?? [5, 5];
    parts.push({ url: `/Img/Avatar/${entry.key}/${file}`, x: off[0], y: off[1] });
  }
  facesTa.value = JSON.stringify(parts, null, 2);
  updatePreview();
}

// --- Live preview via the official hattrick-avatar component -----------------
interface HattrickAvatarEl extends HTMLElement {
  base: string;
  facecard: boolean;
  parts: unknown;
}
const AVATAR_BASE = "https://www.hattrick.org/Img/Avatar/";
const preview = document.createElement("hattrick-avatar") as HattrickAvatarEl;
preview.base = AVATAR_BASE;
preview.facecard = true;
el<HTMLDivElement>("facePreview").appendChild(preview);

/** The component resolves url as base+url, so drop the /Img/Avatar/ prefix. */
function toPreviewPart(p: AvatarPart): AvatarPart {
  return { ...p, url: p.url.replace(/^\/?Img\/Avatar\//, "") };
}

function updatePreview(): void {
  const raw = facesTa.value.trim();
  try {
    const parsed = raw ? (JSON.parse(raw) as AvatarPart[]) : [];
    preview.parts =
      Array.isArray(parsed) && parsed.length ? parsed.map(toPreviewPart) : 4;
  } catch {
    // ignore invalid JSON while the user is typing
  }
}
facesTa.addEventListener("input", updatePreview);

// Gender toggle rebuilds the skin + picker controls for the gender.
for (const btn of document.querySelectorAll<HTMLButtonElement>("#genderToggle button")) {
  btn.addEventListener("click", () => {
    gender = btn.dataset.gender === "f" ? "f" : "m";
    for (const b of document.querySelectorAll<HTMLButtonElement>("#genderToggle button")) {
      b.setAttribute("aria-pressed", String(b === btn));
    }
    resetForGender();
  });
}

function resetForGender(): void {
  const o = toneTable().order;
  selectedTone = o[Math.min(0, o.length - 1)] ?? o[0]!; // lightest
  buildToneSwatches();
  buildPicker();
  applyDefaultSelection();
  assembleFaces();
}

resetForGender();

const stage = el<HTMLDivElement>("stage");
const status = el<HTMLDivElement>("status");
let lastOutput: RenderOutput | null = null;

function gatherInputs(): RenderInputs {
  const bodyType = Number(bodySel.value);
  const paths = assetPathsForBody(bodyType); // relative; renderInputs absolutizes

  let faceElements: AvatarPart[] = [];
  const raw = facesTa.value.trim() || "[]";
  try {
    faceElements = JSON.parse(raw) as AvatarPart[];
  } catch {
    throw new Error("Face elements must be a valid JSON array");
  }

  return {
    faceElements,
    assetsPath: paths.assetsPath,
    meshPath: paths.meshPath,
    outlinePath: paths.outlinePath,
    bodyType,
    kitJson: el<HTMLInputElement>("kitJson").value.trim(),
    width: Number(el<HTMLInputElement>("width").value),
    skinColor: toneTable().hex[selectedTone]!, // body mesh matches the face tone
    neckPosition: Number(el<HTMLInputElement>("neckPosition").value),
    hairOffsetX: Number(el<HTMLInputElement>("hairOffsetX").value),
    hairOffsetY: Number(el<HTMLInputElement>("hairOffsetY").value),
  };
}

function outputSize(out: RenderOutput): string {
  return out instanceof HTMLCanvasElement
    ? `${out.width}×${out.height}`
    : `${out.naturalWidth}×${out.naturalHeight}`;
}

el<HTMLFormElement>("controls").addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Rendering…";
  stage.replaceChildren();
  const container = document.createElement("div");
  stage.appendChild(container);
  try {
    lastOutput = await renderInputs(gatherInputs(), container, {
      slimKitUrl: "/Club/Players/Avatars/slimkitrender.js",
      fullBodiesUrl: "/Club/Players/Avatars/HT.FullBodies.js",
      assetOrigin: location.origin,
    });
    status.textContent = `Rendered ${outputSize(lastOutput)}.`;
  } catch (err) {
    status.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
  }
});

el<HTMLButtonElement>("exportBtn").addEventListener("click", () => {
  if (!lastOutput) {
    status.textContent = "Render first, then export.";
    return;
  }
  const link = document.createElement("a");
  link.download = "player.png";
  link.href =
    lastOutput instanceof HTMLCanvasElement
      ? lastOutput.toDataURL("image/png")
      : lastOutput.src;
  link.click();
});
