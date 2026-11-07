# Composing a team photo

`hattrick-team-photo-compose` turns a set of Hattrick players into one finished
team-photo canvas: figures scaled to a common height, packed into staggered rows
on a stair floor, with an optional header (team name, crest, badge), background
and a name footer. Framework-agnostic, no CHPP, no backend.

## High level

`renderTeamPhoto` does the whole job: it draws each figure with
`hattrick-player-renderer`, builds the stair floor, and composes everything into
a canvas.

```ts
import { renderInputsFromAvatar } from "hattrick-player-renderer";
import { renderTeamPhoto } from "hattrick-team-photo-compose";

const engine = {
  assetOrigin: "https://hattrick-tools.org/team-photo",
  slimKitUrl: "https://hattrick-tools.org/team-photo/Club/Players/Avatars/slimkitrender.js",
  fullBodiesUrl: "https://hattrick-tools.org/team-photo/Club/Players/Avatars/HT.FullBodies.js",
};

const members = players.map((p) => ({
  inputs: renderInputsFromAvatar(p.avatar, { gender: p.gender }),
  number: p.number,
  name: p.name,
}));

const canvas = await renderTeamPhoto(members, {
  engine,
  layout: { rows: 3, stagger: true },
  stairs: { frontHeight: 25, top: "#d3d3d3", front: "#dccece" },
  meta: {
    teamName: "My Team",
    crest: crestImage, // an already-loaded HTMLImageElement, or null
    headerColor: "#ffffff",
    namesColor: "#ffffff",
  },
});
document.body.appendChild(canvas);
```

`members` carry parsed `RenderInputs` (use `renderInputsFromAvatar` for a CHPP
`PlayerAvatar`). A figure that fails to render is skipped, leaving its slot
empty, rather than failing the whole photo. The browser must be able to fetch
the renderer assets from `engine.assetOrigin`; if that origin sends no CORS
headers, proxy the assets and point `assetOrigin` at the proxy (see
`hattrick-player-renderer`).

### Options

- `engine` — `RendererOptions` passed to every figure (asset origin + script URLs).
- `layout` — merged over `DEFAULT_LAYOUT`: `rows`, `stagger`, `figureWidth`,
  `figureHeight`, `gapX`. `rowRise` is derived from the stairs.
- `stairs` — `{ show?, frontHeight?, top?, front? }`; `show: false` omits the floor.
- `meta` — header/footer text, colours, and the `crest`/`badge` images.
- `background` — an already-loaded `HTMLImageElement`, or null.
- `showNames` — draw the footer (default true).

## Low level

For an interactive app that renders and caches figures itself, the building
blocks are exported directly: `computeLayout` (pure, unit-tested row packing),
`composeTeamPhoto` (paints a given set of figures), and the `stairs` helpers
(`stairTileUrl`, `stairRowRise`). This is what the team-photo app uses so it can
re-render one figure without redrawing the rest.

## Install

Inside this monorepo it is a workspace package. Externally it ships as ESM with
types (`dist/`), with `hattrick-player-renderer` as its one dependency.
