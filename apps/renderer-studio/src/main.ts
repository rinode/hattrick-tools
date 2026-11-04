import {
  assetPathsForBody,
  BODY_TYPES,
  renderInputs,
  type AvatarPart,
  type RenderInputs,
} from "hattrick-player-renderer";

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

const stage = el<HTMLDivElement>("stage");
const status = el<HTMLDivElement>("status");
let lastCanvas: HTMLCanvasElement | null = null;

function gatherInputs(): RenderInputs {
  const bodyType = Number(bodySel.value);
  const paths = assetPathsForBody(bodyType); // relative; renderInputs absolutizes

  let faceElements: AvatarPart[] = [];
  const raw = el<HTMLTextAreaElement>("faceElements").value.trim() || "[]";
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
    skinColor: el<HTMLInputElement>("skinColor").value,
    neckPosition: Number(el<HTMLInputElement>("neckPosition").value),
    hairOffsetX: Number(el<HTMLInputElement>("hairOffsetX").value),
    hairOffsetY: Number(el<HTMLInputElement>("hairOffsetY").value),
  };
}

el<HTMLFormElement>("controls").addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Rendering…";
  stage.replaceChildren();
  const container = document.createElement("div");
  stage.appendChild(container);
  try {
    lastCanvas = await renderInputs(gatherInputs(), container, {
      slimKitUrl: "/Club/Players/Avatars/slimkitrender.js",
      fullBodiesUrl: "/Club/Players/Avatars/HT.FullBodies.js",
      assetOrigin: location.origin,
    });
    status.textContent = `Rendered ${lastCanvas.width}×${lastCanvas.height}.`;
  } catch (err) {
    status.textContent = "Error: " + (err instanceof Error ? err.message : String(err));
  }
});

el<HTMLButtonElement>("exportBtn").addEventListener("click", () => {
  if (!lastCanvas) {
    status.textContent = "Render first, then export.";
    return;
  }
  const link = document.createElement("a");
  link.download = "player.png";
  link.href = lastCanvas.toDataURL("image/png");
  link.click();
});
