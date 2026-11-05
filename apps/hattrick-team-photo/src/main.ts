import "hattrick-theme/theme.css";
import "./app.css";
import {
  renderInputs,
  renderInputsFromAvatar,
  type PlayerAvatar,
  type RenderOutput,
} from "hattrick-player-renderer";
import { composeTeamPhoto, naturalSize } from "./compose.js";
import { computeLayout, DEFAULT_LAYOUT, type LayoutOptions } from "./layout.js";

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
  player: SquadPlayer;
  enabled: boolean;
}

// The app is served under a base path (/team-photo), so the API and the local
// vendor assets live under it too. BASE_URL is "/team-photo/" in the build and
// "/" if ever served at the root. VITE_API_BASE still overrides the API origin.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = (import.meta.env.VITE_API_BASE ?? BASE).replace(/\/$/, "");

let squad: SquadItem[] = [];
// Each player's figure is rendered once and reused; toggling, reordering,
// layout and background changes only recompose, which is instant.
const figureCache = new Map<number, RenderOutput | null>();
let background: HTMLImageElement | null = null;
let composed: HTMLCanvasElement | null = null;

function layoutOptions(): LayoutOptions {
  return {
    ...DEFAULT_LAYOUT,
    rows: Number(el<HTMLInputElement>("rows").value),
    maxPerRow: Number(el<HTMLInputElement>("maxPerRow").value),
    stagger: el<HTMLInputElement>("stagger").checked,
  };
}

function figureInputs(player: SquadPlayer) {
  const inputs = renderInputsFromAvatar(player.avatar!, { gender: player.gender });
  // Route the remote kit data through the worker's same-origin proxy. Face
  // parts (/Img/Avatar/…) are already same-origin via assetOrigin.
  inputs.kitJson = inputs.kitJson.replace(/^(?:https?:)?\/\/res\.hattrick\.org\//, "/_kit/");
  return inputs;
}

/** Renders every player's figure once into the cache. Expensive; run on load. */
async function renderFigures(): Promise<void> {
  const status = el("status");
  const temp = document.createElement("div");
  temp.style.cssText = "position:absolute;left:-9999px;top:0";
  document.body.appendChild(temp);

  let done = 0;
  for (const { player } of squad) {
    if (!figureCache.has(player.id)) {
      status.textContent = `Rendering ${done + 1}/${squad.length}`;
      const holder = document.createElement("div");
      temp.appendChild(holder);
      try {
        if (!player.avatar) throw new Error("no avatar");
        figureCache.set(
          player.id,
          await renderInputs(figureInputs(player), holder, {
            assetOrigin: location.origin + BASE,
            slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
            fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
          }),
        );
      } catch (err) {
        console.error(`player ${player.id}`, err);
        figureCache.set(player.id, null);
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
  const enabled = squad.filter((i) => i.enabled).map((i) => i.player);
  if (enabled.length === 0) {
    composed = null;
    stage.replaceChildren();
    el("status").textContent = "No players selected.";
    return;
  }
  const canvases = enabled.map((p) => figureCache.get(p.id) ?? null);
  const opts = layoutOptions();
  // Size every slot to the widest rendered figure (at the common height) so no
  // two figures overlap and the stagger shift is a true half-width.
  let maxW = 0;
  for (const c of canvases) {
    if (!c) continue;
    const { w, h } = naturalSize(c);
    if (w > 0 && h > 0) maxW = Math.max(maxW, w * (opts.figureHeight / h));
  }
  if (maxW > 0) opts.figureWidth = Math.ceil(maxW);
  composed = composeTeamPhoto(canvases, computeLayout(enabled.length, opts), opts, background);
  composed.style.maxWidth = "100%";
  stage.replaceChildren(composed);
  el("status").textContent = `${canvases.filter(Boolean).length}/${enabled.length} rendered.`;
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
    name.textContent = item.player.name || `#${item.player.number}`;

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

async function loadRoster(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/squad`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { teamName: string; players: SquadPlayer[] };
  squad = data.players.map((player) => ({ player, enabled: true }));
  figureCache.clear();
  el("teamName").textContent = data.teamName;
  renderSquadList();
  await renderFigures();
  recompose();
}

// Layout controls only affect composition, so they recompose instantly.
for (const id of ["rows", "maxPerRow", "stagger"]) {
  el<HTMLInputElement>(id).addEventListener("input", () => recompose());
}

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
      '" style="display:block"><button type="button">Connect Hattrick</button></a>';
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
  await loadRoster();
}

init().catch((err) => {
  el("status").textContent = "Error: " + (err instanceof Error ? err.message : String(err));
});
