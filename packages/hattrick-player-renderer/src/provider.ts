import { parseInitArgs } from "./parse.js";
import {
  HATTRICK_ORIGIN,
  renderInputs,
  type RenderOutput,
  type RendererOptions,
} from "./browser.js";
import type { RenderInputs } from "./types.js";

/**
 * How to fetch a player page's HTML by id. The page fetch is cross-origin
 * and may require a logged-in Hattrick web session, so in a browser app this
 * should route through a backend proxy (the team-photo app provides one).
 */
export type PageFetcher = (playerId: number) => Promise<string>;

const defaultPageFetcher: PageFetcher = async (playerId) => {
  const res = await fetch(`${HATTRICK_ORIGIN}/en/Club/Players/Player.aspx?playerId=${playerId}`);
  return res.text();
};

/**
 * Input provision — THE Hattrick-coupled step. Fetches a player's page and
 * parses the `HT.FullBodies.init(...)` arguments into RenderInputs. Nothing
 * in the rendering path touches Hattrick; only this does.
 */
export async function resolveInputsByPlayerId(
  playerId: number,
  opts: { fetchPage?: PageFetcher } = {},
): Promise<RenderInputs> {
  const html = await (opts.fetchPage ?? defaultPageFetcher)(playerId);
  return parseInitArgs(html);
}

/**
 * Convenience that bridges the two halves: resolve a player's inputs from
 * Hattrick, then render them (standalone, against your vendored assets via
 * `assetOrigin`). Kept separate from the pure renderer on purpose.
 */
export async function renderByPlayerId(
  playerId: number,
  container: HTMLElement,
  opts: RendererOptions & { fetchPage?: PageFetcher } = {},
): Promise<RenderOutput> {
  const inputs = await resolveInputsByPlayerId(playerId, { fetchPage: opts.fetchPage });
  return renderInputs(inputs, container, opts);
}
