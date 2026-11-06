import "hattrick-theme/theme.css";
import "./app.css";
import {
  randomRenderInputs,
  renderInputs,
  renderInputsFromAvatar,
  type PlayerAvatar,
  type RenderInputs,
  type RenderOutput,
} from "hattrick-player-renderer";
import { composeTeamPhoto, naturalSize, type PhotoMeta } from "./compose.js";
import { computeLayout, DEFAULT_LAYOUT, type LayoutOptions } from "./layout.js";
import { DEFAULT_FRONT, stairRowRise, stairTileUrl } from "./stairs.js";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

interface SquadPlayer {
  id: number;
  name: string;
  number: number;
  gender: number;
  avatar: PlayerAvatar | null;
}

interface SquadItem {
  id: number;
  number: number;
  name: string;
  enabled: boolean;
  inputs: RenderInputs;
}

// The app is served under a base path (/team-photo), so the API and the local
// vendor assets live under it too. BASE_URL is "/team-photo/" in the build and
// "/" if ever served at the root. VITE_API_BASE still overrides the API origin.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = (import.meta.env.VITE_API_BASE ?? BASE).replace(/\/$/, "");

let squad: SquadItem[] = [];
// Each figure is rendered once and reused; toggling, reordering, layout and
// background changes only recompose, which is instant.
const figureCache = new Map<number, RenderOutput | null>();
let background: HTMLImageElement | null = null;
let crest: HTMLImageElement | null = null;
let teamName = "";
let composed: HTMLCanvasElement | null = null;

// The stair floor texture, drawn under each row. Regenerated whenever the step
// height changes; re-renders when the new tile is ready.
let stairs: HTMLImageElement | null = null;
const stairImg = new Image();
stairImg.onload = () => {
  stairs = stairImg;
  if (composed) recompose();
};

function frontHeight(): number {
  return Number(el<HTMLInputElement>("stairH").value) || DEFAULT_FRONT;
}

/** Rebuilds the stair tile at the current front-face height. onload recomposes. */
function updateStairs(): void {
  stairImg.src = stairTileUrl(frontHeight());
}
updateStairs();

function layoutOptions(): LayoutOptions {
  return {
    ...DEFAULT_LAYOUT,
    rows: Number(el<HTMLInputElement>("rows").value),
    // The front face drives both the stair tile and the row spacing, so a taller
    // front spaces the figure rows further apart (the grey top stays put).
    rowRise: stairRowRise(frontHeight()),
    stagger: el<HTMLInputElement>("stagger").checked,
  };
}

function checked(id: string): boolean {
  return el<HTMLInputElement>(id).checked;
}

/** The background fill: the picked colour at the chosen opacity, as rgba(). */
function bgFill(): string {
  const hex = el<HTMLInputElement>("bgColor").value;
  const a = Number(el<HTMLInputElement>("bgAlpha").value) / 100;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

/** Updates the value labels shown next to the sliders. */
function syncReadouts(): void {
  el("rowsVal").textContent = el<HTMLInputElement>("rows").value;
  el("bgAlphaVal").textContent = `${el<HTMLInputElement>("bgAlpha").value}%`;
}

// --- Fonts -------------------------------------------------------------------
// The two font pickers draw from the full Google Fonts library, fetched once at
// runtime, plus the bundled Rosetta and any uploaded fonts. Each picked Google
// font is loaded on demand; Rosetta (CSS) and uploads are already available.
let allFonts: string[] = [];
const loadedGoogle = new Set<string>();
const customFonts = new Set<string>();

// Always-present families (Rosetta and Roboto ship with the theme) plus a solid
// set of popular Google fonts, used as the list when the live fetch is blocked.
const FALLBACK_FONTS = [
  "Rosetta", "Roboto", "Open Sans", "Lato", "Montserrat", "Oswald", "Raleway", "Poppins",
  "Merriweather", "Playfair Display", "Bebas Neue", "Inter", "Nunito", "Source Sans 3",
  "Roboto Condensed", "Roboto Slab", "PT Sans", "Noto Sans", "Ubuntu", "Rubik", "Work Sans",
  "Fira Sans", "Quicksand", "Josefin Sans", "Archivo", "Barlow", "Dosis", "Teko", "Anton",
  "Pacifico", "Lobster", "Dancing Script", "Caveat", "Permanent Marker", "Abril Fatface",
  "Comfortaa", "Righteous", "Great Vibes", "Bangers", "Fredoka", "Baloo 2", "Cinzel",
  "Cormorant Garamond", "EB Garamond", "Libre Baskerville", "Bitter", "Arvo", "Zilla Slab",
  "Space Grotesk", "Sora", "Manrope", "Figtree", "Outfit", "Plus Jakarta Sans", "DM Sans",
  "DM Serif Display", "Kanit", "Prompt", "Mulish", "Karla", "Heebo", "Jost", "Lexend",
  "Albert Sans", "Fraunces", "Chivo", "Red Hat Display", "Urbanist", "Be Vietnam Pro",
  "Saira", "Cabin", "Varela Round", "Alfa Slab One", "Russo One", "Monoton", "Orbitron",
  "Audiowide", "Press Start 2P", "VT323",
];

/** Loads the full family list once; falls back to the bundled set if blocked. */
async function loadFontList(): Promise<void> {
  let families: string[] = [];
  try {
    const res = await fetch("https://cdn.jsdelivr.net/npm/google-fonts-complete@1.3.0/api-response.json");
    if (res.ok) families = Object.keys((await res.json()) as Record<string, unknown>);
  } catch {
    /* offline or blocked; the fallback set is used */
  }
  const set = new Set<string>([...FALLBACK_FONTS, ...families, ...customFonts]);
  allFonts = [...set].sort((a, b) => a.localeCompare(b));
}

/** Ensures a family is loaded so the canvas can draw with it. */
async function ensureFont(family: string): Promise<void> {
  if (!family || family === "Rosetta" || customFonts.has(family)) return;
  if (!loadedGoogle.has(family)) {
    loadedGoogle.add(family);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;700&display=swap`;
    document.head.appendChild(link);
  }
  try {
    await Promise.all([
      document.fonts.load(`700 52px "${family}"`),
      document.fonts.load(`500 15px "${family}"`),
    ]);
  } catch {
    /* fall back to the default font if it cannot load */
  }
}

/** Turns a font input into a searchable dropdown over the family list. */
function setupFontCombo(inputId: string, onPick: (family: string) => void): void {
  const input = el<HTMLInputElement>(inputId);
  const list = input.parentElement!.querySelector(".combo-list") as HTMLElement;
  let shown: string[] = [];
  let active = -1;

  function render(): void {
    const f = input.value.trim().toLowerCase();
    shown = (f ? allFonts.filter((n) => n.toLowerCase().includes(f)) : allFonts).slice(0, 300);
    list.replaceChildren();
    if (!shown.length) {
      const e = document.createElement("div");
      e.className = "combo-empty";
      e.textContent = "No fonts";
      list.appendChild(e);
    } else {
      shown.forEach((name) => {
        const d = document.createElement("div");
        d.className = "combo-item";
        d.textContent = name;
        d.addEventListener("mousedown", (ev) => {
          ev.preventDefault();
          choose(name);
        });
        list.appendChild(d);
      });
    }
    active = -1;
    list.hidden = false;
  }

  function choose(name: string): void {
    input.value = name;
    list.hidden = true;
    onPick(name);
  }

  input.addEventListener("focus", render);
  input.addEventListener("input", render);
  input.addEventListener("blur", () => setTimeout(() => (list.hidden = true), 150));
  input.addEventListener("keydown", (e) => {
    if (list.hidden) return;
    const rows = [...list.querySelectorAll(".combo-item")] as HTMLElement[];
    if (e.key === "ArrowDown") {
      e.preventDefault();
      active = Math.min(active + 1, rows.length - 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      active = Math.max(active - 1, 0);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose((active >= 0 ? shown[active] : undefined) ?? input.value);
      return;
    } else if (e.key === "Escape") {
      list.hidden = true;
      return;
    } else {
      return;
    }
    rows.forEach((r, i) => r.classList.toggle("active", i === active));
    if (active >= 0) rows[active]!.scrollIntoView({ block: "nearest" });
  });
}

function avatarInputs(player: SquadPlayer): RenderInputs {
  const inputs = renderInputsFromAvatar(player.avatar!, { gender: player.gender });
  // Route the remote kit data through the worker's same-origin proxy. Face
  // parts (/Img/Avatar/…) are already same-origin via assetOrigin.
  inputs.kitJson = inputs.kitJson.replace(/^(?:https?:)?\/\/res\.hattrick\.org\//, "/_kit/");
  return inputs;
}

/** Renders every figure once into the cache. Expensive; run on load. */
async function renderFigures(): Promise<void> {
  const temp = document.createElement("div");
  temp.style.cssText = "position:absolute;left:-9999px;top:0";
  document.body.appendChild(temp);

  // Spinner + count in the stage so progress is visible where the photo lands.
  const stage = el("stage");
  const loader = document.createElement("div");
  loader.className = "loader";
  const wrap = document.createElement("div");
  wrap.className = "spinner-wrap";
  const spinner = document.createElement("div");
  spinner.className = "spinner";
  const count = document.createElement("div");
  count.className = "loader-count";
  wrap.append(spinner, count);
  loader.append(wrap);
  stage.replaceChildren(loader);

  let done = 0;
  for (const item of squad) {
    count.textContent = `${done + 1}/${squad.length}`;
    if (!figureCache.has(item.id)) {
      const holder = document.createElement("div");
      temp.appendChild(holder);
      try {
        figureCache.set(
          item.id,
          await renderInputs(item.inputs, holder, {
            assetOrigin: location.origin + BASE,
            slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
            fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
          }),
        );
      } catch (err) {
        console.error(`figure ${item.id}`, err);
        figureCache.set(item.id, null);
      }
    }
    done++;
  }
  temp.remove();
}

/** Composes the enabled figures, in order, over the background. Instant. */
function recompose(): void {
  const stage = el("stage");
  const enabled = squad.filter((i) => i.enabled);
  if (enabled.length === 0) {
    composed = null;
    const empty = document.createElement("div");
    empty.className = "stage-msg";
    empty.textContent = "No players selected.";
    stage.replaceChildren(empty);
    return;
  }
  const opts = layoutOptions();
  // Each figure keeps its own width (scaled to the common height) and packs
  // adjacent to the next, so nothing is squeezed and nothing overlaps.
  const rendered: RenderOutput[] = [];
  const widths: number[] = [];
  const members: { number: number; name: string }[] = [];
  for (const item of enabled) {
    const c = figureCache.get(item.id);
    if (!c) continue;
    const { w, h } = naturalSize(c);
    rendered.push(c);
    widths.push(h > 0 ? w * (opts.figureHeight / h) : opts.figureWidth);
    members.push({ number: item.number, name: item.name });
  }
  const meta: PhotoMeta = {
    teamName: checked("showName") ? teamName : undefined,
    crest: checked("showCrest") ? crest : null,
    crestShadow: checked("crestShadow"),
    members: checked("showNames") ? members : [],
    bgColor: bgFill(),
    headerFont: el<HTMLInputElement>("headerFont").value || undefined,
    headerColor: el<HTMLInputElement>("headerColor").value,
    namesFont: el<HTMLInputElement>("namesFont").value || undefined,
    namesColor: el<HTMLInputElement>("namesColor").value,
  };
  const floor = checked("showStairs") ? stairs : null;
  composed = composeTeamPhoto(rendered, computeLayout(widths, opts), opts, background, meta, floor);
  composed.style.maxWidth = "100%";
  stage.replaceChildren(composed);
}

function move(index: number, delta: number): void {
  const to = index + delta;
  if (to < 0 || to >= squad.length) return;
  [squad[index], squad[to]] = [squad[to]!, squad[index]!];
  renderSquadList();
  recompose();
}

function renderSquadList(): void {
  const list = el("squad");
  list.replaceChildren();
  squad.forEach((item, i) => {
    const row = document.createElement("div");
    row.className = "squad-item" + (item.enabled ? "" : " disabled");

    const check = document.createElement("input");
    check.type = "checkbox";
    check.checked = item.enabled;
    check.addEventListener("change", () => {
      item.enabled = check.checked;
      row.classList.toggle("disabled", !item.enabled);
      recompose();
    });

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = item.number ? `${item.number}. ${item.name}` : item.name;

    const up = document.createElement("button");
    up.type = "button";
    up.className = "mv";
    up.textContent = "↑";
    up.disabled = i === 0;
    up.addEventListener("click", () => move(i, -1));

    const down = document.createElement("button");
    down.type = "button";
    down.className = "mv";
    down.textContent = "↓";
    down.disabled = i === squad.length - 1;
    down.addEventListener("click", () => move(i, 1));

    row.append(check, name, up, down);
    list.appendChild(row);
  });
}

async function showSquad(label: string): Promise<void> {
  figureCache.clear();
  el("teamName").textContent = label;
  // Rows can go up to one per player (silly, but allowed).
  const rowsEl = el<HTMLInputElement>("rows");
  rowsEl.max = String(Math.max(1, squad.length));
  if (Number(rowsEl.value) > squad.length) rowsEl.value = rowsEl.max;
  syncReadouts();
  renderSquadList();
  await renderFigures();
  recompose();
}

function loadImage(src: string | null): Promise<HTMLImageElement | null> {
  if (!src) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadRoster(teamId?: number): Promise<void> {
  const url = `${API_BASE}/api/squad${teamId ? `?teamId=${teamId}` : ""}`;
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as {
    teamName: string;
    crest: string | null;
    players: SquadPlayer[];
  };
  squad = data.players
    .filter((p) => p.avatar)
    .map((p) => {
      // Hattrick returns 100 for a player with no shirt number; treat as none.
      const number = p.number === 100 ? 0 : p.number;
      return {
        id: p.id,
        number,
        name: p.name || (number ? `#${number}` : "Unnamed"),
        enabled: true,
        inputs: avatarInputs(p),
      };
    });
  teamName = data.teamName;
  crest = await loadImage(data.crest);
  await showSquad(data.teamName);
}

/** Populates the team picker when the user owns more than one team. */
async function loadTeams(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/teams`, { credentials: "include" });
  if (!res.ok) return;
  const { teams } = (await res.json()) as {
    teams: { id: number; name: string; primary: boolean }[];
  };
  if (teams.length <= 1) return;

  const select = el<HTMLSelectElement>("team");
  select.replaceChildren();
  for (const t of teams) {
    const opt = document.createElement("option");
    opt.value = String(t.id);
    opt.textContent = t.name;
    opt.selected = t.primary;
    select.appendChild(opt);
  }
  el("teamPick").style.display = "";
  select.addEventListener("change", () => {
    loadRoster(Number(select.value)).catch((err) => {
      el("status").textContent = "Error: " + (err instanceof Error ? err.message : String(err));
    });
  });
}

/** A randomly generated 22-player demo with the default kit (no connection). */
async function loadDemo(): Promise<void> {
  squad = Array.from({ length: 22 }, (_, i) => ({
    id: i + 1,
    number: i + 1,
    name: `Player ${i + 1}`,
    enabled: true,
    inputs: randomRenderInputs(),
  }));
  teamName = "Demo FC";
  crest = null;
  await showSquad("demo");
}

// Layout and label controls only affect composition, so they recompose instantly.
for (const id of ["rows", "stagger", "showName", "showCrest", "showNames", "showStairs", "crestShadow"]) {
  const ev = id === "rows" ? "input" : "change";
  el<HTMLInputElement>(id).addEventListener(ev, () => {
    syncReadouts();
    recompose();
  });
}

// Background colour and opacity; recompose live as they change.
el<HTMLInputElement>("bgColor").addEventListener("input", () => recompose());
el<HTMLInputElement>("bgAlpha").addEventListener("input", () => {
  syncReadouts();
  recompose();
});

// Text colour pickers.
el<HTMLInputElement>("headerColor").addEventListener("input", () => recompose());
el<HTMLInputElement>("namesColor").addEventListener("input", () => recompose());

// Font pickers: load the chosen family, then recompose.
setupFontCombo("headerFont", (f) => void ensureFont(f).then(() => recompose()));
setupFontCombo("namesFont", (f) => void ensureFont(f).then(() => recompose()));

// Upload a custom font: register it and make it selectable in both pickers.
el<HTMLInputElement>("fontUpload").addEventListener("change", async (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const family = file.name.replace(/\.(ttf|otf|woff2?)$/i, "").trim() || "Custom font";
  try {
    const face = new FontFace(family, await file.arrayBuffer());
    await face.load();
    document.fonts.add(face);
    customFonts.add(family);
    if (!allFonts.includes(family)) allFonts.unshift(family);
    recompose();
  } catch (err) {
    console.error("font upload", err);
  }
});

// Fetch the family list, then redraw once the default fonts are ready so the
// first photo uses Rosetta/Roboto rather than a fallback.
void loadFontList();
document.fonts.ready.then(() => {
  if (composed) recompose();
});

// The front face drives the stair tile and the row spacing; regenerate the tile
// (its onload recomposes with the new rowRise).
el<HTMLInputElement>("stairH").addEventListener("input", () => updateStairs());

el<HTMLInputElement>("bgFile").addEventListener("change", (event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const img = new Image();
  img.onload = () => {
    background = img;
    recompose();
  };
  img.src = URL.createObjectURL(file);
});

el<HTMLButtonElement>("bgClear").addEventListener("click", () => {
  background = null;
  el<HTMLInputElement>("bgFile").value = "";
  recompose();
});

el<HTMLButtonElement>("exportBtn").addEventListener("click", () => {
  if (!composed) {
    el("status").textContent = "Nothing to export yet.";
    return;
  }
  const link = document.createElement("a");
  link.download = "team-photo.png";
  link.href = composed.toDataURL("image/png");
  link.click();
});

async function init(): Promise<void> {
  const auth = el("auth");
  let connected = false;
  try {
    const res = await fetch(`${API_BASE}/api/auth/status`, { credentials: "include" });
    connected = res.ok && (await res.json()).connected === true;
  } catch {
    /* backend unreachable; fall through to Connect */
  }

  if (!connected) {
    auth.innerHTML =
      '<a href="' +
      `${API_BASE}/api/auth/login` +
      '" style="display:block"><button type="button">Connect Hattrick</button></a>' +
      '<p class="demo-note">Not connected. Showing a random demo squad.</p>';
    await loadDemo();
    return;
  }

  auth.innerHTML =
    'Connected · <a id="disconnect" href="#" style="color:var(--accent)">disconnect</a>';
  el<HTMLAnchorElement>("disconnect").addEventListener("click", (e) => {
    e.preventDefault();
    fetch(`${API_BASE}/api/auth/logout`, { method: "POST", credentials: "include" }).finally(() =>
      location.reload(),
    );
  });
  await loadTeams();
  await loadRoster();
}

init().catch((err) => {
  el("status").textContent = "Error: " + (err instanceof Error ? err.message : String(err));
});
