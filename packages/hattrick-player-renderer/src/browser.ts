import type { RenderInputs } from "./types.js";

/** Hattrick's full-body renderer, as exposed on `window.HT.FullBodies`. */
interface HtFullBodies {
  init(
    faceElements: unknown,
    assetsPath: string,
    meshPath: string,
    outlinePath: string,
    bodyType: number,
    kitJson: string,
    width: number,
    skinColor: string,
    neckPosition: number,
    hairOffsetX: number,
    hairOffsetY: number,
  ): void;
  render(containerId: string): void;
}

declare global {
  interface Window {
    HT?: { FullBodies?: HtFullBodies };
  }
}

/** Hattrick's own asset origin and renderer bundle. Configurable. */
export const HATTRICK_ORIGIN = "https://www.hattrick.org";
export const DEFAULT_SLIMKIT_URL = `${HATTRICK_ORIGIN}/Club/Players/Avatars/slimkitrender.js`;
export const DEFAULT_FULLBODIES_URL = `${HATTRICK_ORIGIN}/Club/Players/Avatars/HT.FullBodies.js`;

/** What the renderer appends and returns: a canvas or an img (data-URI). */
export type RenderOutput = HTMLCanvasElement | HTMLImageElement;

export interface RendererOptions {
  /** URL of Hattrick's slimkitrender bundle. */
  slimKitUrl?: string;
  /** URL of the HT.FullBodies stub. */
  fullBodiesUrl?: string;
  /** Origin to resolve relative asset paths against (SVG/JSON/kit). */
  assetOrigin?: string;
}

function loadScript(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${url}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = url;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${url}`));
    document.head.appendChild(s);
  });
}

/**
 * Our added body type 13 (seated). The stock engine only knows types 1–12 (+20)
 * in its `bodyTypeMap` (external→internal) and `neck_pos_body` (face Y per body).
 * A missing entry makes the remap yield `undefined` and the face Y become NaN, so
 * we register 13 on the global SlimKitRenderer after it loads — no edits to the
 * vendored engine. 13 maps to itself; its neck sits one body-8 collar + the 46px
 * the seated torso was lowered (body 8 → internal 9, neck 127, +46 = 173).
 */
function registerCustomBodyTypes(): void {
  const skr = (window as unknown as { SlimKitRenderer?: { bodyTypeMap?: { h: Record<number, number> }; neck_pos_body?: { h: Record<number, number> } } }).SlimKitRenderer;
  const map = skr?.bodyTypeMap?.h;
  const neck = skr?.neck_pos_body?.h;
  if (map && neck && map[13] === undefined) {
    map[13] = 13;
    neck[13] = 173;
  }
}

/** Loads Hattrick's renderer scripts and resolves once `HT.FullBodies` exists. */
export async function loadRenderer(opts: RendererOptions = {}): Promise<HtFullBodies> {
  await loadScript(opts.slimKitUrl ?? DEFAULT_SLIMKIT_URL);
  await loadScript(opts.fullBodiesUrl ?? DEFAULT_FULLBODIES_URL);
  const fb = window.HT?.FullBodies;
  if (!fb) throw new Error("HT.FullBodies not available after loading renderer scripts");
  registerCustomBodyTypes();
  return fb;
}

/** Resolves a relative asset path (e.g. "/Club/...") to an absolute URL. */
export function absolutize(pathOrUrl: string, origin: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (/^(blob:|data:)/.test(pathOrUrl)) return pathOrUrl; // already-usable URLs (e.g. uploaded kits)
  if (pathOrUrl.startsWith("//")) return "https:" + pathOrUrl;
  return origin.replace(/\/$/, "") + pathOrUrl;
}

interface FaceNode {
  url: string;
  x: number;
  y: number;
  next: FaceNode | null;
}

/**
 * slimkitrender walks face parts as a `.next`-linked chain starting at
 * element 0, and with an empty array it reads `undefined.url` and throws —
 * while a null value makes it skip faces and render the bare body. So build
 * the linked chain for a non-empty set, and return null for an empty one.
 */
export function faceChain(
  parts: ReadonlyArray<{ url: string; x: number; y: number }>,
  origin: string,
): FaceNode[] | null {
  if (!parts || parts.length === 0) return null;
  const nodes: FaceNode[] = parts.map((p) => ({
    url: absolutize(p.url, origin),
    x: p.x,
    y: p.y,
    next: null,
  }));
  for (let i = 0; i < nodes.length - 1; i++) nodes[i]!.next = nodes[i + 1]!;
  return nodes;
}

let containerSeq = 0;

/**
 * Renders a figure from already-parsed inputs into `container`, returning the
 * `<canvas>` the renderer appends. Relative asset paths are made absolute so
 * the renderer works on an origin other than hattrick.org.
 *
 * Note: the browser must be able to fetch the SVG/JSON/kit assets from the
 * asset origin — if that origin does not send CORS headers, route the assets
 * through a same-origin proxy and pass its base as `assetOrigin`.
 */
export async function renderInputs(
  inputs: RenderInputs,
  container: HTMLElement,
  opts: RendererOptions = {},
): Promise<RenderOutput> {
  const fb = await loadRenderer(opts);
  const origin = opts.assetOrigin ?? HATTRICK_ORIGIN;

  if (!container.id) container.id = `ht-fullbody-${++containerSeq}`;

  fb.init(
    faceChain(inputs.faceElements, origin),
    absolutize(inputs.assetsPath, origin),
    absolutize(inputs.meshPath, origin),
    absolutize(inputs.outlinePath, origin),
    inputs.bodyType,
    absolutize(inputs.kitJson, origin),
    inputs.width,
    inputs.skinColor,
    inputs.neckPosition,
    inputs.hairOffsetX,
    inputs.hairOffsetY,
  );
  fb.render(container.id);

  // slimkit appends its result (a <canvas>, or an <img> data-URI like the real
  // Hattrick page uses) once compositing finishes. Resolve the instant that
  // element appears — matching only "canvas" is why detection used to miss it.
  return new Promise((resolve, reject) => {
    const found = () => container.querySelector("canvas, img") as RenderOutput | null;
    const existing = found();
    if (existing) return resolve(existing);
    const observer = new MutationObserver(() => {
      const output = found();
      if (output) {
        observer.disconnect();
        resolve(output);
      }
    });
    observer.observe(container, { childList: true, subtree: true });
    setTimeout(() => {
      observer.disconnect();
      const output = found();
      if (output) resolve(output);
      else reject(new Error("renderer produced no output element"));
    }, 30000);
  });
}
