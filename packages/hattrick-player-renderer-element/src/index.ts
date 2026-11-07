// <ht-player-avatar>: an embeddable custom element that draws a Hattrick
// full-body figure into its Shadow DOM. Self-contained (the renderer is bundled
// in), framework-free, and served as one script by the worker at /embed/.
//
// Usage:
//   <script src="https://hattrick-tools.org/embed/ht-player-avatar.js"></script>
//   <ht-player-avatar width="240"></ht-player-avatar>
//   <script>document.querySelector("ht-player-avatar").avatar = chppAvatar;</script>
//
// Inputs (set as JS properties; the element re-renders on change):
//   .inputs  — a full RenderInputs object (advanced, full control), or
//   .avatar  — a CHPP PlayerAvatar (layer list); `gender` attribute picks m/f.
// Attributes: asset-origin (default https://hattrick-tools.org/team-photo),
//   gender ("m" | "f"), width (px).
import {
  renderInputs,
  renderInputsFromAvatar,
  type PlayerAvatar,
  type RenderInputs,
} from "hattrick-player-renderer";

const DEFAULT_ORIGIN = "https://hattrick-tools.org/team-photo";

class HtPlayerAvatar extends HTMLElement {
  static get observedAttributes(): string[] {
    return ["asset-origin", "gender", "width"];
  }
  #root: ShadowRoot;
  #inputs: RenderInputs | null = null;
  #avatar: PlayerAvatar | null = null;
  #seq = 0;

  constructor() {
    super();
    this.#root = this.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = ":host{display:inline-block} :host img,:host canvas{max-width:100%;height:auto}";
    this.#root.appendChild(style);
  }

  connectedCallback(): void {
    void this.#render();
  }
  attributeChangedCallback(): void {
    void this.#render();
  }

  set inputs(v: RenderInputs | null) {
    this.#inputs = v;
    void this.#render();
  }
  get inputs(): RenderInputs | null {
    return this.#inputs;
  }
  set avatar(v: PlayerAvatar | null) {
    this.#avatar = v;
    void this.#render();
  }
  get avatar(): PlayerAvatar | null {
    return this.#avatar;
  }

  #origin(): string {
    return (this.getAttribute("asset-origin") ?? DEFAULT_ORIGIN).replace(/\/$/, "");
  }

  async #render(): Promise<void> {
    const origin = this.#origin();
    let inputs = this.#inputs;
    if (!inputs && this.#avatar) {
      const gender = this.getAttribute("gender") === "f" ? "f" : "m";
      inputs = renderInputsFromAvatar(this.#avatar, { gender });
      // Route the remote kit through the origin's same-origin proxy.
      inputs.kitJson = inputs.kitJson.replace(
        /^(?:https?:)?\/\/res\.hattrick\.org\//,
        `${origin}/_kit/`,
      );
    }
    if (!inputs) return;
    const width = this.getAttribute("width");
    if (width) inputs = { ...inputs, width: Number(width) };

    const my = ++this.#seq;
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:-9999px;top:0";
    document.body.appendChild(holder);
    try {
      const out = await renderInputs(inputs, holder, {
        assetOrigin: origin,
        slimKitUrl: `${origin}/Club/Players/Avatars/slimkitrender.js`,
        fullBodiesUrl: `${origin}/Club/Players/Avatars/HT.FullBodies.js`,
      });
      if (my !== this.#seq) return;
      for (const node of [...this.#root.childNodes]) if (node.nodeName !== "STYLE") node.remove();
      this.#root.appendChild(out);
    } catch (err) {
      this.dispatchEvent(new CustomEvent("error", { detail: err }));
    } finally {
      holder.remove();
    }
  }
}

if (!customElements.get("ht-player-avatar")) {
  customElements.define("ht-player-avatar", HtPlayerAvatar);
}

export { HtPlayerAvatar };
