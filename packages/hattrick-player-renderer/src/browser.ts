import type { RenderInputs } from "./types.js";

/** Hattrick's full-body renderer, as exposed on `window.HT.FullBodies`. */
interface HtFullBodies {
  init(
    faceElements: unknown[],
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

/** Loads Hattrick's renderer scripts and resolves once `HT.FullBodies` exists. */
export async function loadRenderer(opts: RendererOptions = {}): Promise<HtFullBodies> {
  await loadScript(opts.slimKitUrl ?? DEFAULT_SLIMKIT_URL);
  await loadScript(opts.fullBodiesUrl ?? DEFAULT_FULLBODIES_URL);
  const fb = window.HT?.FullBodies;
  if (!fb) throw new Error("HT.FullBodies not available after loading renderer scripts");
  return fb;
}

/** Resolves a relative asset path (e.g. "/Club/...") to an absolute URL. */
export function absolutize(pathOrUrl: string, origin: string): string {
  if (!pathOrUrl) return "";
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (pathOrUrl.startsWith("//")) return "https:" + pathOrUrl;
  return origin.replace(/\/$/, "") + pathOrUrl;
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
): Promise<HTMLCanvasElement> {
  const fb = await loadRenderer(opts);
  const origin = opts.assetOrigin ?? HATTRICK_ORIGIN;

  if (!container.id) container.id = `ht-fullbody-${++containerSeq}`;

  fb.init(
    inputs.faceElements.map((p) => ({ ...p, url: absolutize(p.url, origin) })),
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

  return new Promise((resolve, reject) => {
    const started = Date.now();
    const poll = () => {
      const canvas = container.querySelector("canvas");
      if (canvas) return resolve(canvas);
      if (Date.now() - started > 15000) return reject(new Error("render timed out"));
      requestAnimationFrame(poll);
    };
    poll();
  });
}
