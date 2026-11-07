import { type JSX, useEffect, useRef } from "react";
import {
  renderInputs,
  type RenderInputs,
  type RendererOptions,
  type RenderOutput,
} from "hattrick-player-renderer";

export interface AvatarFigureProps {
  /** Everything the full-body figure needs. */
  inputs: RenderInputs;
  /** Engine/asset URLs (slimKitUrl, fullBodiesUrl, assetOrigin). */
  engine?: RendererOptions;
  className?: string;
  /** Called with the rendered <canvas>/<img> when a render completes. */
  onRendered?: (out: RenderOutput) => void;
  onError?: (err: unknown) => void;
}

/**
 * Renders a Hattrick full-body figure. The engine is imperative and builds into
 * a detached holder, so we render off-screen then move the resulting node into
 * our host. A sequence guard drops stale renders (rapid input changes, React
 * StrictMode double-invoke); identical inputs/engine don't re-render.
 */
export function AvatarFigure({
  inputs,
  engine,
  className,
  onRendered,
  onError,
}: AvatarFigureProps): JSX.Element {
  const hostRef = useRef<HTMLDivElement>(null);
  const seqRef = useRef(0);
  // Keep callbacks current without retriggering the render effect.
  const cbRef = useRef({ onRendered, onError });
  cbRef.current = { onRendered, onError };

  const inputsKey = JSON.stringify(inputs);
  const engineKey = JSON.stringify(engine ?? {});

  useEffect(() => {
    const my = ++seqRef.current;
    let cancelled = false;
    const holder = document.createElement("div");
    holder.style.cssText = "position:absolute;left:-9999px;top:0";
    document.body.appendChild(holder);
    renderInputs(inputs, holder, engine ?? {})
      .then((out) => {
        if (cancelled || my !== seqRef.current) return;
        hostRef.current?.replaceChildren(out);
        cbRef.current.onRendered?.(out);
      })
      .catch((err) => {
        if (!cancelled && my === seqRef.current) cbRef.current.onError?.(err);
      })
      .finally(() => holder.remove());
    return () => {
      cancelled = true;
    };
  }, [inputsKey, engineKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={hostRef} className={className} />;
}
