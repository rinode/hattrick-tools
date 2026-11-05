import "hattrick-theme/theme.css";
import "./app.css";
import {
  renderInputs,
  renderInputsFromAvatar,
  type PlayerAvatar,
  type RenderOutput,
} from "hattrick-player-renderer";
import { composeTeamPhoto } from "./compose.js";
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

// The app is served under a base path (/team-photo), so the API and the local
// vendor assets live under it too. BASE_URL is "/team-photo/" in the build and
// "/" if ever served at the root. VITE_API_BASE still overrides the API origin.
const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");
const API_BASE = (import.meta.env.VITE_API_BASE ?? BASE).replace(/\/$/, "");

let roster: SquadPlayer[] = [];
let composed: HTMLCanvasElement | null = null;

function layoutOptions(): LayoutOptions {
  return {
    ...DEFAULT_LAYOUT,
    rows: Number(el<HTMLInputElement>("rows").value),
    maxPerRow: Number(el<HTMLInputElement>("maxPerRow").value),
    stagger: el<HTMLInputElement>("stagger").checked,
  };
}

async function loadRoster(): Promise<void> {
  const res = await fetch(`${API_BASE}/api/squad`, { credentials: "include" });
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { teamName: string; players: SquadPlayer[] };
  roster = data.players;
  el("roster").textContent = `${data.teamName}: ${roster.length} players`;
}

async function generate(): Promise<void> {
  const opts = layoutOptions();
  const stage = el("stage");
  const status = el("status");
  stage.replaceChildren();

  const temp = document.createElement("div");
  temp.style.cssText = "position:absolute;left:-9999px;top:0";
  document.body.appendChild(temp);

  const canvases: Array<RenderOutput | null> = [];
  for (let i = 0; i < roster.length; i++) {
    status.textContent = `Rendering ${i + 1}/${roster.length}…`;
    const holder = document.createElement("div");
    temp.appendChild(holder);
    const player = roster[i]!;
    try {
      if (!player.avatar) throw new Error("no avatar");
      // Full-body inputs straight from the CHPP avatar — no page scrape.
      const inputs = renderInputsFromAvatar(player.avatar, { gender: player.gender });
      // Route the remote kit data through the worker's same-origin proxy, so the
      // fetch isn't cross-origin. Face parts (/Img/Avatar/…) are already
      // same-origin via assetOrigin + the worker's /Img/Avatar proxy.
      inputs.kitJson = inputs.kitJson.replace(/^(?:https?:)?\/\/res\.hattrick\.org\//, "/_kit/");
      canvases.push(
        await renderInputs(inputs, holder, {
          assetOrigin: location.origin + BASE,
          slimKitUrl: `${BASE}/Club/Players/Avatars/slimkitrender.js`,
          fullBodiesUrl: `${BASE}/Club/Players/Avatars/HT.FullBodies.js`,
        }),
      );
    } catch (err) {
      console.error(`player ${player.id}`, err);
      canvases.push(null);
    }
  }
  temp.remove();

  const layout = computeLayout(roster.length, opts);
  composed = composeTeamPhoto(canvases, layout, opts);
  composed.style.maxWidth = "100%";
  stage.replaceChildren(composed);
  status.textContent = `Rendered ${canvases.filter(Boolean).length}/${roster.length}.`;
}

el<HTMLFormElement>("controls").addEventListener("submit", (event) => {
  event.preventDefault();
  generate().catch((err) => {
    el("status").textContent = "Error: " + (err instanceof Error ? err.message : String(err));
  });
});

el<HTMLButtonElement>("exportBtn").addEventListener("click", () => {
  if (!composed) {
    el("status").textContent = "Generate the photo first.";
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
    el("roster").textContent = "";
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
  el("roster").textContent = "Error: " + (err instanceof Error ? err.message : String(err));
});
