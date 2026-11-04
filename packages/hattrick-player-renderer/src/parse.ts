import type { AvatarPart, RenderInputs } from "./types.js";

const INIT_MARKER = "HT.FullBodies.init(";

/**
 * Extracts the raw argument text inside the first `HT.FullBodies.init(...)`
 * call, respecting nested brackets and quoted strings.
 */
export function extractInitArgs(source: string): string {
  const i = source.indexOf(INIT_MARKER);
  if (i < 0) throw new Error("HT.FullBodies.init( not found in source");
  const start = i + INIT_MARKER.length;

  let depth = 1;
  let quote: string | null = null;
  for (let j = start; j < source.length; j++) {
    const ch = source[j]!;
    if (quote) {
      if (ch === quote && source[j - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") quote = ch;
    else if (ch === "(" || ch === "[" || ch === "{") depth++;
    else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      if (depth === 0) return source.slice(start, j);
    }
  }
  throw new Error("unterminated HT.FullBodies.init( call");
}

/** Splits an argument list on top-level commas (ignores brackets/quotes). */
export function splitTopLevel(args: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let quote: string | null = null;
  let current = "";
  for (let j = 0; j < args.length; j++) {
    const ch = args[j]!;
    if (quote) {
      current += ch;
      if (ch === quote && args[j - 1] !== "\\") quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      current += ch;
    } else if (ch === "(" || ch === "[" || ch === "{") {
      depth++;
      current += ch;
    } else if (ch === ")" || ch === "]" || ch === "}") {
      depth--;
      current += ch;
    } else if (ch === "," && depth === 0) {
      out.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim() !== "") out.push(current.trim());
  return out;
}

function unquote(s: string): string {
  const t = s.trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) {
    return t.slice(1, -1);
  }
  return t;
}

/** Parses a JS array-of-objects literal (quoted or bareword keys) into parts. */
function parseFaceElements(literal: string): AvatarPart[] {
  let json = literal.trim();
  try {
    return JSON.parse(json) as AvatarPart[];
  } catch {
    // Tolerate bareword keys and single quotes: {url:'x'} -> {"url":"x"}.
    json = json.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":').replace(/'/g, '"');
    return JSON.parse(json) as AvatarPart[];
  }
}

/**
 * Parses the inputs out of a player page's `HT.FullBodies.init(...)` call.
 * `source` may be the whole page HTML or just the init call.
 */
export function parseInitArgs(source: string): RenderInputs {
  const parts = splitTopLevel(extractInitArgs(source));
  if (parts.length < 11) {
    throw new Error(`expected 11 init arguments, got ${parts.length}`);
  }
  return {
    faceElements: parseFaceElements(parts[0]!),
    assetsPath: unquote(parts[1]!),
    meshPath: unquote(parts[2]!),
    outlinePath: unquote(parts[3]!),
    bodyType: Number(parts[4]),
    kitJson: unquote(parts[5]!),
    width: Number(parts[6]),
    skinColor: unquote(parts[7]!),
    neckPosition: Number(parts[8]),
    hairOffsetX: Number(parts[9]),
    hairOffsetY: Number(parts[10]),
  };
}
