# Embedding `<ht-player-avatar>`

A self-contained custom element that draws a Hattrick full-body figure in Shadow
DOM. One script, no build step, no framework.

```html
<script src="https://hattrick-tools.org/embed/ht-player-avatar.js"></script>
<ht-player-avatar width="240"></ht-player-avatar>
<script>
  document.querySelector("ht-player-avatar").avatar = chppAvatar; // CHPP PlayerAvatar
</script>
```

Inputs (set as JS properties; the element re-renders on change):

- `.avatar` — a CHPP `PlayerAvatar` (the layer list). The `gender` attribute
  ("m" | "f") picks the body set.
- `.inputs` — a full `RenderInputs` object for complete control (advanced).

Attributes:

- `asset-origin` — where the engine, face parts and kit proxy are served from.
  Defaults to `https://hattrick-tools.org/team-photo`, which serves the vendored
  assets, the `/_kit` proxy and the engine scripts.
- `gender` — "m" (default) or "f", used with `.avatar`.
- `width` — figure width in px.

The bundle is built by `hattrick-player-renderer-element` into the worker's
`public/embed/` and served by the worker's static route. `player-id` embedding
(resolving a player to their avatar) needs CHPP auth, so it would run against the
worker origin only; the explicit `.avatar` / `.inputs` paths are public.
