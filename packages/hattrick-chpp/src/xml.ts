import { XMLParser } from "fast-xml-parser";
import { ChppError } from "./errors.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

/** The decoded `<HattrickData>` root of a CHPP response. */
export type HattrickData = Record<string, unknown>;

/**
 * Parses CHPP XML into the `<HattrickData>` object and validates it the way
 * the Go client's DecodeXML does: a non-empty `<Error>` becomes a thrown
 * ChppError, and `<FileName>` must match `${apiFile}.xml`.
 */
export function decodeXml(buf: string, apiFile: string): HattrickData {
  const parsed = parser.parse(buf) as Record<string, unknown>;
  const root = parsed["HattrickData"] as HattrickData | undefined;
  if (!root) {
    throw new ChppError(`response is not a CHPP HattrickData document (expected ${apiFile}.xml)`);
  }

  const err = str(root["Error"]);
  if (err) {
    throw new ChppError(err, str(root["ErrorCode"]), str(root["ErrorGUID"]));
  }

  const fileName = str(root["FileName"]);
  if (fileName.toLowerCase() !== `${apiFile}.xml`.toLowerCase()) {
    throw new ChppError(`failed to parse the right ${apiFile} type (got FileName="${fileName}")`);
  }
  return root;
}

// --- small coercion helpers used by the endpoint mappers ---

export function str(v: unknown): string {
  if (v === undefined || v === null) return "";
  if (typeof v === "object") return "";
  return String(v);
}

export function num(v: unknown): number {
  const s = str(v);
  if (s === "") return 0;
  const n = Number(s);
  return Number.isFinite(n) ? n : 0;
}

export function bool(v: unknown): boolean {
  return str(v).toLowerCase() === "true";
}

/** Normalizes a repeated XML element that may be absent, single, or an array. */
export function asArray<T = unknown>(v: unknown): T[] {
  if (v === undefined || v === null) return [];
  return (Array.isArray(v) ? v : [v]) as T[];
}
