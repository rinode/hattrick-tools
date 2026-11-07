// High-level: render parsed inputs straight to a finished team-photo canvas.
export * from "./render.js";
// Low-level building blocks, for callers that render their own figures (e.g.
// an interactive app that caches figures) and compose by hand.
export * from "./layout.js";
export * from "./compose.js";
export * from "./stairs.js";
