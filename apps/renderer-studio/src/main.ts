import "hattrick-theme/theme.css";
import "./app.css";
import {
  assetPathsForBody,
  BODY_TYPES,
  facePartNumbers,
  partOffset,
  renderInputs,
  type AvatarPart,
  type PartCategory,
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

  // Settings drawer: the toggle and backdrop open/close it. The drawer is
  // anchored inside <main>, which already sits below the header.
  const controls = document.getElementById("controls");
  const backdrop = document.getElementById("backdrop");
  const toggle = document.getElementById("menuToggle");
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

const bodyBox = el<HTMLDivElement>("bodyPicker");
let bodyType = 10;

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
  let files = Object.keys(CATALOG[cfg.key] ?? {})
    .filter((n) => isUniversal(n) || matchesShape(n, shape))
    .sort(naturalSort);
  // Head parts (eyes/noses/mouths/goatees): the manifest knows exactly which
  // part numbers exist for this face shape, so drop files that don't — a stepper
  // should never land on a combo that renders nothing.
  const headCat = HEAD_CAT[cfg.key];
  if (headCat) {
    const valid = new Set(facePartNumbers(gender, shape, headCat));
    if (valid.size) {
      files = files.filter((f) => {
        const n = Number(f.match(/\d+/)?.[0]);
        return Number.isNaN(n) || valid.has(n);
      });
    }
  }
  return cfg.optional ? ["", ...files] : files;
}

function currentFaceFile(): string {
  const shape = shapeOf();
  return `f${shape}${resolveTone(shape, selectedTone)}.png`;
}
/** Face base file for a given shape at the current tone. */
function faceFileForShape(shape: string): string {
  return `f${shape}${resolveTone(shape, selectedTone)}.png`;
}
/** Thumbnail URL for one option value of a part (a FACE value is a shape string). */
function optionThumbUrl(cfg: PartCfg, value: string): string {
  if (!value) return "";
  if (cfg.key === FACE) return `${BASE}/Img/Avatar/${faceBaseCat()}/${faceFileForShape(value)}`;
  return `${BASE}/Img/Avatar/${cfg.key}/${value}`;
}
/** Short label for an option (filename without .png, or "none"/"shape N"). */
function optionLabel(cfg: PartCfg, value: string): string {
  if (!value) return "none";
  if (cfg.key === FACE) return `shape ${value}`;
  return value.replace(/\.png$/, "");
}
/** A checkerboard-backed thumbnail tile. */
function thumbEl(url: string, alt: string): HTMLDivElement {
  const t = document.createElement("div");
  t.className = "thumb";
  if (url) {
    const img = document.createElement("img");
    img.src = url;
    img.alt = alt;
    img.loading = "lazy";
    t.appendChild(img);
  } else {
    t.classList.add("empty");
  }
  return t;
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
      buildSteppers(); // face thumbnails depend on the tone
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

// The currently open popover's close function, so opening one (or any rebuild)
// closes any other first.
let activeClose: (() => void) | null = null;
function closeActivePopover(): void {
  if (activeClose) {
    const f = activeClose;
    activeClose = null;
    f();
  }
}

interface PickerSpec {
  label: string;
  value: string; // the currently selected option
  options: string[];
  thumbUrlFor: (value: string) => string; // "" → an empty tile
  labelFor: (value: string) => string;
  onChoose: (value: string) => void;
}

// A reusable control: a trigger showing the current selection; clicking it opens
// a floating, scrollable grid of every option (thumbnails) that overlays the
// page (appended to <body>, positioned under the trigger) rather than pushing
// the panel open. Picking, clicking away, scrolling or Escape closes it.
function createPicker(spec: PickerSpec): HTMLDivElement {
  const wrap = document.createElement("div");
  wrap.className = "picker-item";

  const head = document.createElement("div");
  head.className = "picker-head";
  const label = document.createElement("span");
  label.textContent = spec.label;
  const cur = document.createElement("span");
  cur.className = "picker-cur";
  cur.textContent = spec.labelFor(spec.value);
  head.append(label, cur);

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "picker-trigger";
  trigger.setAttribute("aria-expanded", "false");
  let trThumb = thumbEl(spec.thumbUrlFor(spec.value), spec.labelFor(spec.value));
  const chev = document.createElement("span");
  chev.className = "chev";
  chev.textContent = "▾";
  trigger.append(trThumb, chev);

  const grid = document.createElement("div");
  grid.className = "grid";
  grid.hidden = true;

  const onDocPointer = (e: PointerEvent): void => {
    const target = e.target as Node;
    if (!grid.contains(target) && !trigger.contains(target)) closeGrid();
  };
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === "Escape") closeGrid();
  };

  // Anchor under the trigger, but always keep the popover inside the viewport:
  // clamp its width/left horizontally, and place it below or above (whichever
  // has more room) with its height capped to that space so it never overflows.
  function positionGrid(): void {
    const m = 8; // viewport margin
    const r = trigger.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const width = Math.min(r.width, vw - 2 * m);
    grid.style.width = `${width}px`;
    grid.style.left = `${Math.max(m, Math.min(r.left, vw - width - m))}px`;

    const spaceBelow = vh - r.bottom - m;
    const spaceAbove = r.top - m;
    grid.style.maxHeight = "none";
    const needed = grid.offsetHeight;
    if (needed <= spaceBelow || spaceBelow >= spaceAbove) {
      grid.style.top = `${r.bottom + 4}px`;
      grid.style.maxHeight = `${Math.max(80, spaceBelow)}px`;
    } else {
      const h = Math.min(needed, spaceAbove);
      grid.style.top = `${Math.max(m, r.top - 4 - h)}px`;
      grid.style.maxHeight = `${Math.max(80, spaceAbove)}px`;
    }
  }

  function closeGrid(): void {
    if (grid.hidden) return;
    grid.hidden = true;
    grid.remove();
    trigger.setAttribute("aria-expanded", "false");
    wrap.classList.remove("open");
    document.removeEventListener("pointerdown", onDocPointer, true);
    window.removeEventListener("scroll", closeGrid, true);
    window.removeEventListener("resize", closeGrid);
    document.removeEventListener("keydown", onKey, true);
    if (activeClose === closeGrid) activeClose = null;
  }

  let built = false;
  function openGrid(): void {
    closeActivePopover();
    if (!built) buildGrid();
    document.body.appendChild(grid);
    grid.hidden = false;
    positionGrid();
    trigger.setAttribute("aria-expanded", "true");
    wrap.classList.add("open");
    activeClose = closeGrid;
    // Defer so the opening click itself doesn't immediately close it.
    setTimeout(() => document.addEventListener("pointerdown", onDocPointer, true), 0);
    window.addEventListener("scroll", closeGrid, true);
    window.addEventListener("resize", closeGrid);
    document.addEventListener("keydown", onKey, true);
  }

  const choose = (value: string): void => {
    cur.textContent = spec.labelFor(value);
    const nt = thumbEl(spec.thumbUrlFor(value), spec.labelFor(value));
    trigger.replaceChild(nt, trThumb);
    trThumb = nt;
    for (const c of grid.querySelectorAll<HTMLElement>(".cell"))
      c.setAttribute("aria-selected", String(c.dataset.value === value));
    closeGrid();
    spec.onChoose(value);
  };

  function buildGrid(): void {
    grid.replaceChildren();
    for (const value of spec.options) {
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      cell.dataset.value = value;
      cell.title = spec.labelFor(value);
      cell.setAttribute("aria-selected", String(value === spec.value));
      cell.appendChild(thumbEl(spec.thumbUrlFor(value), spec.labelFor(value)));
      cell.addEventListener("click", () => choose(value));
      grid.appendChild(cell);
    }
    built = true;
  }

  trigger.addEventListener("click", () => {
    if (wrap.classList.contains("open")) closeGrid();
    else openGrid();
  });

  wrap.append(head, trigger);
  return wrap;
}

// The part pickers. Options are the manifest-filtered set for the current shape;
// picking a face shape re-filters every other part.
function buildSteppers(): void {
  closeActivePopover();
  pickerBox.replaceChildren();
  for (const cfg of parts()) {
    const opts = optionsFor(cfg);
    const curVal = cfg.key === FACE ? shapeOf() : currentValue(cfg, opts);
    pickerBox.appendChild(
      createPicker({
        label: cfg.label,
        value: curVal,
        options: opts,
        thumbUrlFor: (v) => optionThumbUrl(cfg, v),
        labelFor: (v) => optionLabel(cfg, v),
        onChoose: (v) => {
          if (cfg.key === FACE) {
            faceShapeIdx = Math.max(0, faceShapes().indexOf(v));
            buildSteppers(); // part options depend on the shape — re-filter them
          } else {
            sel.set(cfg.key, v);
          }
          scheduleRender();
        },
      }),
    );
    currentValue(cfg, opts); // seed default into `sel`
  }
}

// The body-type picker: each option's thumbnail is that body's outline SVG.
function buildBodyPicker(): void {
  closeActivePopover();
  bodyBox.replaceChildren();
  bodyBox.appendChild(
    createPicker({
      label: "Body type",
      value: String(bodyType),
      options: BODY_TYPES.map(String),
      thumbUrlFor: (v) => assetPathsForBody(Number(v), BASE).outlinePath,
      labelFor: (v) => `body ${v}`,
      onChoose: (v) => {
        bodyType = Number(v);
        scheduleRender();
      },
    }),
  );
}

// Head-part category keys (either gender) → the manifest's category letter.
// These are placed per face shape, so their offset comes from the manifest.
const HEAD_CAT: Record<string, PartCategory> = {
  eyes: "e",
  noses: "n",
  mouths: "m",
  goatees: "g",
  eyes_f: "e",
  noses_f: "n",
  mouths_f: "m",
};

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
    // Head parts: offset from the manifest for the current shape; others (hair,
    // beards, behind-hair) fall back to the catalog's baked offset.
    const headCat = HEAD_CAT[cfg.key];
    const off =
      (headCat && partOffset(gender, shapeOf(), headCat, value)) ??
      CATALOG[cfg.key]?.[value] ??
      [5, 5];
    out.push({ url: `/Img/Avatar/${cfg.key}/${value}`, x: off[0], y: off[1] });
  }
  return out;
}

function gatherInputs(): RenderInputs {
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
for (const id of ["width", "kitJson", "neckPosition", "hairOffsetX", "hairOffsetY"]) {
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

const randOf = <T>(arr: T[]): T | undefined => arr[Math.floor(Math.random() * arr.length)];

/** Re-rolls tone, face shape and every part within the valid options for the
 *  current gender (part options are manifest-filtered to the chosen shape). */
function randomize(): void {
  const tones = toneTable().order;
  selectedTone = randOf(tones) ?? selectedTone;
  faceShapeIdx = Math.floor(Math.random() * faceShapes().length);
  sel.clear();
  for (const cfg of parts()) {
    if (cfg.key === FACE) continue;
    const opts = optionsFor(cfg); // depends on the shape set just above
    if (opts.length) sel.set(cfg.key, randOf(opts) ?? "");
  }
  buildToneSwatches();
  buildSteppers();
  scheduleRender();
}

el<HTMLButtonElement>("randomBtn").addEventListener("click", randomize);

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

buildBodyPicker();
resetForGender();
