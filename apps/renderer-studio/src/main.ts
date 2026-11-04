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

/** The harvested catalog: category -> filename -> [x, y] offset. */
type FaceCatalog = Record<string, Record<string, [number, number]>>;
const CATALOG = faceCatalog as unknown as FaceCatalog;

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

// Skin tones actually used on Hattrick, surveyed across ~330 players
// (light → dark). Shown as swatches instead of a free colour picker.
const SKIN_TONES = [
  "#f9e4d2", "#f6d8bc", "#f4dfb0", "#eccaba", "#ecaca2", "#f6c3b6", "#f4b9a3", "#eaa673",
  "#e78e64", "#dab384", "#d89973", "#cc7a56", "#ca684b", "#c18472", "#bf7163", "#b97e58",
  "#b58e63", "#a96743", "#a8583a", "#946040", "#925238", "#764d2f", "#754229",
];
let selectedSkin = "#f6d8bc";

const swatchBox = el<HTMLDivElement>("skinSwatches");
for (const tone of SKIN_TONES) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "swatch";
  b.style.background = tone;
  b.title = tone;
  b.setAttribute("aria-pressed", String(tone === selectedSkin));
  b.addEventListener("click", () => {
    selectedSkin = tone;
    for (const child of swatchBox.children) child.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-pressed", "true");
  });
  swatchBox.appendChild(b);
}

// ---------------------------------------------------------------------------
// Face-part picker
//
// Each row is one category. Categories, and their back-to-front draw order,
// differ by gender. A selection assembles a flat faceElements array using the
// per-part offset from the catalog; url is canonical root-relative
// (/Img/Avatar/<cat>/<file>), which is what slimkit and real Hattrick pages
// use. The hattrick-avatar preview wants paths relative to its base, so the
// /Img/Avatar/ prefix is stripped just before previewing.
// ---------------------------------------------------------------------------

interface CategoryDef {
  key: string; // catalog key / path segment under /Img/Avatar/
  label: string;
}

// Ordered back (drawn first) to front (drawn last).
const MALE_CATEGORIES: CategoryDef[] = [
  { key: "faces", label: "Face" },
  { key: "eyes", label: "Eyes" },
  { key: "noses", label: "Nose" },
  { key: "mouths", label: "Mouth" },
  { key: "goatees", label: "Goatee" },
  { key: "beards", label: "Beard" },
  { key: "hair", label: "Hair" },
  { key: "filled_hair", label: "Filled hair" },
];
const FEMALE_CATEGORIES: CategoryDef[] = [
  { key: "hair_f_behind", label: "Hair (behind)" },
  { key: "faces_f", label: "Face" },
  { key: "eyes_f", label: "Eyes" },
  { key: "noses_f", label: "Nose" },
  { key: "mouths_f", label: "Mouth" },
  { key: "hair_f", label: "Hair" },
  { key: "filled_hair_f", label: "Filled hair" },
];

let gender: "m" | "f" = "m";
const pickerBox = el<HTMLDivElement>("facePicker");
const facesTa = el<HTMLTextAreaElement>("faceElements");

function categories(): CategoryDef[] {
  return gender === "m" ? MALE_CATEGORIES : FEMALE_CATEGORIES;
}

/** Natural sort so f2a precedes f10a. */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function buildPicker(): void {
  pickerBox.replaceChildren();
  for (const cat of categories()) {
    const files = Object.keys(CATALOG[cat.key] ?? {}).sort(naturalSort);
    const label = document.createElement("label");
    label.textContent = `${cat.label} (${files.length})`;
    const sel = document.createElement("select");
    sel.dataset.cat = cat.key;
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

/** A plausible default face so the preview/render is non-empty on load. */
function applyDefaultSelection(): void {
  const first = (cat: string): string => {
    const files = Object.keys(CATALOG[cat] ?? {}).sort(naturalSort);
    return files[0] ?? "";
  };
  const defaults: Record<string, string> =
    gender === "m"
      ? { faces: first("faces"), eyes: first("eyes"), noses: first("noses"), mouths: first("mouths"), hair: first("hair") }
      : { faces_f: first("faces_f"), eyes_f: first("eyes_f"), noses_f: first("noses_f"), mouths_f: first("mouths_f"), hair_f: first("hair_f") };
  for (const sel of pickerBox.querySelectorAll<HTMLSelectElement>("select")) {
    const want = defaults[sel.dataset.cat ?? ""];
    if (want) sel.value = want;
  }
}

/** Read the selects, build faceElements, and sync the textarea + preview. */
function assembleFaces(): void {
  const parts: AvatarPart[] = [];
  for (const cat of categories()) {
    const sel = pickerBox.querySelector<HTMLSelectElement>(`select[data-cat="${cat.key}"]`);
    const file = sel?.value;
    if (!file) continue;
    const off = CATALOG[cat.key]?.[file] ?? [5, 5];
    parts.push({ url: `/Img/Avatar/${cat.key}/${file}`, x: off[0], y: off[1] });
  }
  facesTa.value = JSON.stringify(parts, null, 2);
  updatePreview();
}

// Live face-part preview via the official hattrick-avatar component. Its part
// images come straight from Hattrick (cross-origin, display only).
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

// Gender toggle rebuilds the picker and reselects defaults.
for (const btn of document.querySelectorAll<HTMLButtonElement>("#genderToggle button")) {
  btn.addEventListener("click", () => {
    gender = btn.dataset.gender === "f" ? "f" : "m";
    for (const b of document.querySelectorAll<HTMLButtonElement>("#genderToggle button")) {
      b.setAttribute("aria-pressed", String(b === btn));
    }
    buildPicker();
    applyDefaultSelection();
    assembleFaces();
  });
}

buildPicker();
applyDefaultSelection();
assembleFaces();

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
    skinColor: selectedSkin,
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
