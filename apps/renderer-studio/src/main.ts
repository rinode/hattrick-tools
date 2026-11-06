import "hattrick-theme/theme.css";
import "./app.css";
import {
  assetPathsForBody,
  BODY_TYPES,
  renderInputs,
  type AvatarPart,
  type RenderInputs,
  type RenderOutput,
} from "hattrick-player-renderer";
import faceCatalog from "./face-catalog.json";

// Served under a base path (/player-renderer); vendor assets live under it too.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

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

/** Wires the config tab bar and the settings drawer (open/close + sizing). */
function setupTabs(): void {
  const btns = [...document.querySelectorAll<HTMLButtonElement>(".tab-btn")];
  const panels = [...document.querySelectorAll<HTMLElement>(".tab-panel")];
  const show = (name: string): void => {
    for (const b of btns) b.classList.toggle("active", b.dataset.tab === name);
    for (const p of panels) p.classList.toggle("active", p.dataset.tab === name);
  };
  for (const b of btns) b.addEventListener("click", () => show(b.dataset.tab ?? ""));
  if (btns[0]?.dataset.tab) show(btns[0].dataset.tab);

  // Settings drawer: the toggle and backdrop open/close it; the drawer and
  // backdrop start below the header, whose height is published as --header-h.
  const controls = document.getElementById("controls");
  const backdrop = document.getElementById("backdrop");
  const toggle = document.getElementById("menuToggle");
  const header = document.querySelector("header");
  const syncHeaderH = (): void => {
    if (header) document.documentElement.style.setProperty("--header-h", `${header.offsetHeight}px`);
  };
  syncHeaderH();
  window.addEventListener("resize", syncHeaderH);
  const setOpen = (open: boolean): void => {
    controls?.classList.toggle("open", open);
    backdrop?.classList.toggle("open", open);
    toggle?.setAttribute("aria-expanded", String(open));
  };
  toggle?.addEventListener("click", () => setOpen(!controls?.classList.contains("open")));
  backdrop?.addEventListener("click", () => setOpen(false));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") setOpen(false);
  });
}
setupTabs();

const bodySel = el<HTMLSelectElement>("bodyType");
for (const n of BODY_TYPES) {
  const opt = document.createElement("option");
  opt.value = String(n);
  opt.textContent = `Body ${n}`;
  if (n === 10) opt.selected = true;
  bodySel.appendChild(opt);
}

// ---------------------------------------------------------------------------
// Model
//
// Skin is one control: a tone swatch sets the body `skinColor` AND the face
// variant (f<shape><tone>, nearest tone a shape ships). Parts are chosen with
// steppers over the actual PNGs, filtered to what suits the current face:
// a part file prefixed f<shape> is drawn for that face shape only, so only the
// selected shape's parts (plus shape-agnostic ones) are shown. The trailing
// letter is skin tone on the face base but hair/beard COLOUR elsewhere, so it
// is not a cross-category filter. Everything renders on change — no button.
// ---------------------------------------------------------------------------

const FACE = "@face";
interface PartCfg {
  key: string | typeof FACE;
  label: string;
  optional: boolean;
}
// In draw order: back (first) to front (last).
const MALE_PARTS: PartCfg[] = [
  { key: FACE, label: "Face shape", optional: false },
  { key: "eyes", label: "Eyes", optional: false },
  { key: "noses", label: "Nose", optional: false },
  { key: "mouths", label: "Mouth", optional: false },
  { key: "goatees", label: "Goatee", optional: true },
  { key: "beards", label: "Beard", optional: true },
  { key: "hair", label: "Hair", optional: false },
  { key: "filled_hair", label: "Filled hair", optional: true },
];
const FEMALE_PARTS: PartCfg[] = [
  { key: "hair_f_behind", label: "Hair (behind)", optional: true },
  { key: FACE, label: "Face shape", optional: false },
  { key: "eyes_f", label: "Eyes", optional: false },
  { key: "noses_f", label: "Nose", optional: false },
  { key: "mouths_f", label: "Mouth", optional: false },
  { key: "hair_f", label: "Hair", optional: false },
];

let gender: "m" | "f" = "m";
let selectedTone = "c";
let faceShapeIdx = 0;
const sel = new Map<string, string>(); // part key -> chosen filename ("" = none)

const swatchBox = el<HTMLDivElement>("skinSwatches");
const pickerBox = el<HTMLDivElement>("facePicker");
const stage = el<HTMLDivElement>("stage");
const status = el<HTMLDivElement>("status");

function toneTable(): ToneTable {
  return TONES[gender];
}
function faceBaseCat(): string {
  return gender === "m" ? "faces" : "faces_f";
}
function parts(): PartCfg[] {
  return gender === "m" ? MALE_PARTS : FEMALE_PARTS;
}
function faceShapes(): string[] {
  return Object.keys(toneTable().shapes).sort(naturalSort);
}
function shapeOf(): string {
  return faceShapes()[faceShapeIdx] ?? "1";
}

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}
function hexLum(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.3 * ((n >> 16) & 255) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255);
}
/** Nearest tone (by luminance) that `shape` actually ships. */
function resolveTone(shape: string, wanted: string): string {
  const t = toneTable();
  const avail = t.shapes[shape] ?? [];
  if (avail.includes(wanted) || !avail.length) return wanted;
  const target = hexLum(t.hex[wanted] ?? "#000000");
  return avail.reduce((best, code) =>
    Math.abs(hexLum(t.hex[code] ?? "#0") - target) < Math.abs(hexLum(t.hex[best] ?? "#0") - target)
      ? code
      : best,
  );
}

// A file prefixed f<digit> is drawn for that face shape; others are universal.
function isUniversal(name: string): boolean {
  return !/^f\d/.test(name);
}
function matchesShape(name: string, shape: string): boolean {
  return new RegExp(`^f${shape}(?!\\d)`).test(name);
}

/** Options suitable for the current face: universal ∪ selected-shape parts. */
function optionsFor(cfg: PartCfg): string[] {
  if (cfg.key === FACE) return faceShapes();
  const shape = shapeOf();
  const files = Object.keys(CATALOG[cfg.key] ?? {})
    .filter((n) => isUniversal(n) || matchesShape(n, shape))
    .sort(naturalSort);
  return cfg.optional ? ["", ...files] : files;
}

function currentFaceFile(): string {
  const shape = shapeOf();
  return `f${shape}${resolveTone(shape, selectedTone)}.png`;
}
function thumbUrl(cfg: PartCfg, value: string): string {
  if (cfg.key === FACE) return `${BASE}/Img/Avatar/${faceBaseCat()}/${currentFaceFile()}`;
  return value ? `${BASE}/Img/Avatar/${cfg.key}/${value}` : "";
}

// --- Skin-tone swatches ------------------------------------------------------
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
      for (const c of swatchBox.children) c.setAttribute("aria-pressed", "false");
      b.setAttribute("aria-pressed", "true");
      refreshFaceThumb();
      scheduleRender();
    });
    swatchBox.appendChild(b);
  }
}

// --- Part steppers -----------------------------------------------------------
function currentValue(cfg: PartCfg, opts: string[]): string {
  if (cfg.key === FACE) return shapeOf();
  let v = sel.get(cfg.key);
  if (v === undefined || !opts.includes(v)) {
    v = cfg.optional ? "" : (opts[0] ?? "");
    sel.set(cfg.key, v);
  }
  return v;
}

function buildSteppers(): void {
  pickerBox.replaceChildren();
  for (const cfg of parts()) {
    const opts = optionsFor(cfg);
    const key = cfg.key === FACE ? FACE : cfg.key;

    const wrap = document.createElement("div");
    wrap.className = "stepper";
    wrap.dataset.key = key;
    const head = document.createElement("div");
    head.className = "stepper-head";
    const label = document.createElement("span");
    label.textContent = cfg.label;
    const idxEl = document.createElement("span");
    idxEl.className = "stepper-idx";
    head.append(label, idxEl);
    const row = document.createElement("div");
    row.className = "stepper-row";
    const prev = document.createElement("button");
    prev.type = "button";
    prev.className = "arrow";
    prev.textContent = "◀";
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    const img = document.createElement("img");
    thumb.appendChild(img);
    const next = document.createElement("button");
    next.type = "button";
    next.className = "arrow";
    next.textContent = "▶";
    row.append(prev, thumb, next);
    wrap.append(head, row);
    pickerBox.appendChild(wrap);

    const indexNow = (): number => {
      if (cfg.key === FACE) return faceShapeIdx;
      return Math.max(0, opts.indexOf(currentValue(cfg, opts)));
    };
    const paint = (): void => {
      const i = indexNow();
      const value = opts[i] ?? "";
      idxEl.textContent = `${i + 1}/${opts.length}`;
      const url = thumbUrl(cfg, value);
      if (url) {
        img.src = url;
        img.alt = cfg.key === FACE ? currentFaceFile() : value;
        thumb.classList.remove("empty");
      } else {
        img.removeAttribute("src");
        thumb.classList.add("empty");
      }
    };
    const step = (d: number): void => {
      const n = opts.length;
      const i = (indexNow() + d + n) % n;
      if (cfg.key === FACE) {
        faceShapeIdx = i;
        buildSteppers(); // part options depend on the shape — re-filter them
      } else {
        sel.set(cfg.key, opts[i] ?? "");
        paint();
      }
      scheduleRender();
    };
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));
    currentValue(cfg, opts); // seed default into `sel`
    paint();
  }
}

/** When tone changes, only the face thumbnail must re-resolve. */
function refreshFaceThumb(): void {
  const img = pickerBox.querySelector<HTMLImageElement>(`.stepper[data-key="${FACE}"] img`);
  if (img) {
    img.src = `${BASE}/Img/Avatar/${faceBaseCat()}/${currentFaceFile()}`;
    img.alt = currentFaceFile();
  }
}

// --- Assemble + render -------------------------------------------------------
function buildFaceElements(): AvatarPart[] {
  const out: AvatarPart[] = [];
  const faceCat = faceBaseCat();
  for (const cfg of parts()) {
    if (cfg.key === FACE) {
      const file = currentFaceFile();
      const off = CATALOG[faceCat]?.[file] ?? [5, 5];
      out.push({ url: `/Img/Avatar/${faceCat}/${file}`, x: off[0], y: off[1] });
      continue;
    }
    const value = sel.get(cfg.key) ?? "";
    if (!value) continue;
    const off = CATALOG[cfg.key]?.[value] ?? [5, 5];
    out.push({ url: `/Img/Avatar/${cfg.key}/${value}`, x: off[0], y: off[1] });
  }
  return out;
}

function gatherInputs(): RenderInputs {
  const bodyType = Number(bodySel.value);
  const paths = assetPathsForBody(bodyType);
  return {
    faceElements: buildFaceElements(),
    assetsPath: paths.assetsPath,
    meshPath: paths.meshPath,
    outlinePath: paths.outlinePath,
    bodyType,
    // Fall back to the default Hattrick kit when the field is empty.
    kitJson: el<HTMLInputElement>("kitJson").value.trim() || "/default-kit.json",
    width: Number(el<HTMLInputElement>("width").value),
    skinColor: toneTable().hex[selectedTone]!,
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

let lastOutput: RenderOutput | null = null;
let seq = 0;
let timer: number | undefined;

async function render(): Promise<void> {
  const my = ++seq;
  status.textContent = "Rendering…";
  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;left:-9999px;top:0";
  document.body.appendChild(holder);
  try {
    const out = await renderInputs(gatherInputs(), holder, {
      slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
      fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
      assetOrigin: location.origin + BASE,
    });
    if (my !== seq) return;
    lastOutput = out;
    stage.replaceChildren(out);
    status.textContent = `Rendered ${outputSize(out)}.`;
  } catch (err) {
    if (my === seq)
      status.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
  } finally {
    holder.remove();
  }
}

function scheduleRender(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(render, 120);
}

// --- Gender + live inputs ----------------------------------------------------
for (const btn of document.querySelectorAll<HTMLButtonElement>("#genderToggle button")) {
  btn.addEventListener("click", () => {
    gender = btn.dataset.gender === "f" ? "f" : "m";
    for (const b of document.querySelectorAll<HTMLButtonElement>("#genderToggle button")) {
      b.setAttribute("aria-pressed", String(b === btn));
    }
    resetForGender();
  });
}
for (const id of ["bodyType", "width", "kitJson", "neckPosition", "hairOffsetX", "hairOffsetY"]) {
  el(id).addEventListener("input", scheduleRender);
  el(id).addEventListener("change", scheduleRender);
}

function resetForGender(): void {
  selectedTone = toneTable().order[0]!; // lightest
  faceShapeIdx = 0;
  sel.clear();
  buildToneSwatches();
  buildSteppers();
  scheduleRender();
}

el<HTMLButtonElement>("exportBtn").addEventListener("click", () => {
  if (!lastOutput) {
    status.textContent = "Nothing to export yet.";
    return;
  }
  const link = document.createElement("a");
  link.download = "player.png";
  link.href =
    lastOutput instanceof HTMLCanvasElement ? lastOutput.toDataURL("image/png") : lastOutput.src;
  link.click();
});

resetForGender();
