import { renderByPlayerId } from "hattrick-player-renderer";
import { composeTeamPhoto } from "./compose.js";
import { computeLayout, DEFAULT_LAYOUT, type LayoutOptions } from "./layout.js";

function el<T extends HTMLElement>(id: string): T {
  const node = document.getElementById(id);
  if (!node) throw new Error(`missing #${id}`);
  return node as T;
}

interface RosterPlayer {
  id: number;
  name: string;
  number: number;
}

let roster: RosterPlayer[] = [];
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
  const res = await fetch("/api/roster");
  if (!res.ok) throw new Error(await res.text());
  const data = (await res.json()) as { teamName: string; players: RosterPlayer[] };
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

  const fetchPage = async (id: number): Promise<string> => {
    const r = await fetch(`/api/player-page?id=${id}`);
    if (!r.ok) throw new Error(await r.text());
    return r.text();
  };

  const canvases: Array<import("hattrick-player-renderer").RenderOutput | null> = [];
  for (let i = 0; i < roster.length; i++) {
    status.textContent = `Rendering ${i + 1}/${roster.length}…`;
    const holder = document.createElement("div");
    temp.appendChild(holder);
    try {
      canvases.push(
        await renderByPlayerId(roster[i]!.id, holder, {
          assetOrigin: location.origin,
          slimKitUrl: "/Club/Players/Avatars/slimkitrender.js",
          fullBodiesUrl: "/Club/Players/Avatars/HT.FullBodies.js",
          fetchPage,
        }),
      );
    } catch (err) {
      console.error(`player ${roster[i]!.id}`, err);
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

loadRoster().catch((err) => {
  el("roster").textContent = "Roster error: " + (err instanceof Error ? err.message : String(err));
});
