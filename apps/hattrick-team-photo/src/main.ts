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

function avatarInputs(player: SquadPlayer): RenderInputs {
  const inputs = renderInputsFromAvatar(player.avatar!, { gender: player.gender });
  // Route the remote kit data through the worker's same-origin proxy. Face
  // parts (/Img/Avatar/…) are already same-origin via assetOrigin.
  inputs.kitJson = inputs.kitJson.replace(/^(?:https?:)?\/\/res\.hattrick\.org\//, "/_kit/");
  return inputs;
}

/** Renders every figure once into the cache. Expensive; run on load. */
async function renderFigures(): Promise<void> {
  const status = el("status");
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
    status.textContent = `Rendering ${done + 1}/${squad.length}`;
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
  status.textContent = "";
}

/** Composes the enabled figures, in order, over the background. Instant. */
function recompose(): void {
  const stage = el("stage");
  const enabled = squad.filter((i) => i.enabled);
  if (enabled.length === 0) {
    composed = null;
    stage.replaceChildren();
    el("status").textContent = "No players selected.";
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
    members: checked("showNames") ? members : [],
  };
  composed = composeTeamPhoto(rendered, computeLayout(widths, opts), opts, background, meta, stairs);
  composed.style.maxWidth = "100%";
  stage.replaceChildren(composed);
  el("status").textContent = `${rendered.length}/${enabled.length} rendered.`;
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
    name.textContent = `${item.number}. ${item.name}`;

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
    .map((p) => ({
      id: p.id,
      number: p.number,
      name: p.name || `#${p.number}`,
      enabled: true,
      inputs: avatarInputs(p),
    }));
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
for (const id of ["rows", "stagger", "showName", "showCrest", "showNames"]) {
  const ev = id === "rows" ? "input" : "change";
  el<HTMLInputElement>(id).addEventListener(ev, () => recompose());
}

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
