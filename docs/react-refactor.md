# React refactor

Move the two vanilla-TS frontends to React, extract shared UI, and expose the
renderer as an embeddable web component.

## Why

`hattrick-team-photo` (~2200 LOC) and `renderer-studio` (~940 LOC) are vanilla
TS doing manual DOM work. They duplicate the drawer, tabs, gender toggle, skin
swatches, part/body pickers, render stage and export. The renderer is also worth
embedding outside these apps.

## Stack

- React 19, `@vitejs/plugin-react`. Keep Vite 6, Turborepo, pnpm, strict TS.
- `@base-ui/react` (v1.x, stable) for headless components: Drawer, Tabs,
  Popover, Scroll Area, Toggle Group, Radio Group, Number Field, Field, Input,
  Button, Tooltip. Its Popover has built-in anchoring (`collisionAvoidance`
  flip/shift, `collisionBoundary` + `collisionPadding`) and outside-press /
  Escape dismissal, which replaces the hand-rolled picker positioning, backdrop
  and key handling.
- Styling: CSS Modules per component over the existing `theme.css` tokens. No
  Tailwind (tokens already exist; CSS custom properties cross the Shadow DOM
  boundary the embed needs, utility classes do not).
- State: React context + `useReducer` per app. No external store.
- Tests: Vitest + `@testing-library/react` + jsdom. Existing renderer and worker
  tests stay.
- Two separate app entrypoints kept, so worker routing (`/team-photo`,
  `/player-renderer`) and Vite `base` paths are unchanged.

## Packages

New:

- `hattrick-ui`: React component library, source-only (exports `./src`, no build
  step; the Vite apps compile its TSX + CSS Modules). Primitives wrap Base UI;
  domain controls are `GenderToggle`, `SkinSwatches`, `ThumbTile`, `PartPicker`,
  `BodyPicker`, plus `AppShell`/`Drawer`/`Tabs`. Holds the shared
  `useAvatarConfig` reducer (gender, tone, shape, parts, body, manifest-driven
  options).
- `hattrick-player-renderer-react`: thin wrapper exposing `<AvatarFigure
  inputs={...} />` / `useAvatarRender`, managing the imperative render lifecycle
  (abort stale renders, StrictMode double-invoke).
- `hattrick-player-renderer-element`: `<ht-player-avatar>` custom element built
  as one self-contained bundle served by the worker at `/embed/…`. Shadow DOM
  isolation, `asset-origin` attribute (default `hattrick-tools.org`), avatar
  spec as a property. Base-UI-free and dependency-light. `player-id` resolution
  needs CHPP auth, so it works only against the worker origin; ship the explicit
  spec path first.

Unchanged: `hattrick-player-renderer` (core, framework-agnostic),
`hattrick-theme` (tokens + font), `hattrick-chpp`, `hattrick-core`,
`hattrick-worker`.

## Phases (each shippable)

1. Tooling + `hattrick-ui` scaffold. Add React/Base UI deps, Vite React plugin,
   JSX tsconfig, RTL setup. Build `ThumbTile` + `PartPicker` (Base UI Popover +
   Scroll Area) as the proof, preserving the manifest-filtered option list.
2. Rest of `hattrick-ui`: Tabs, Drawer/AppShell, GenderToggle, SkinSwatches,
   BodyPicker, Number/Text fields, Button, `useAvatarConfig`.
3. `hattrick-player-renderer-react` (`<AvatarFigure>`).
4. Rewrite `renderer-studio` in React (pilot: smaller, self-contained). Verify
   parity: gender, tone, shape, parts, body grid, randomize, export, popover.
5. Rewrite `hattrick-team-photo` in React; reuse `hattrick-ui`; keep
   compose/layout/stairs as consumed pure-TS modules.
6. `hattrick-player-renderer-element` + worker `/embed/` route.
7. Delete the vanilla `main.ts`/`app.css`, consolidate.

## Risks

- Wrapping the imperative `slimkitrender` canvas in React effects (stale-render
  aborts, StrictMode).
- Keeping Vite `base` and worker asset routing identical so the deploy path does
  not shift.
- Base UI Popover positioning is a no-op in jsdom; test picker behaviour (open,
  filter, select) not pixel positions.
