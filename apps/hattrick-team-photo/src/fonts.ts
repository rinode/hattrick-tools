// Font catalogue + on-demand loading for the team-photo text controls. Draws
// from the full Google Fonts library (fetched once, with a bundled fallback),
// plus Rosetta and any uploaded fonts. Ported from the vanilla app.
export interface FontStyle {
  weight: number;
  italic: boolean;
  label: string;
  value: string;
}

const WEIGHT_NAMES: Record<number, string> = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "SemiBold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};

export const FALLBACK_FONTS = [
  "Rosetta",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Oswald",
  "Raleway",
  "Poppins",
  "Merriweather",
  "Playfair Display",
  "Bebas Neue",
  "Inter",
  "Nunito",
  "Source Sans 3",
  "Roboto Condensed",
  "Roboto Slab",
  "PT Sans",
  "Noto Sans",
  "Ubuntu",
  "Rubik",
  "Work Sans",
  "Fira Sans",
  "Quicksand",
  "Josefin Sans",
  "Archivo",
  "Barlow",
  "Dosis",
  "Teko",
  "Anton",
  "Pacifico",
  "Lobster",
  "Dancing Script",
  "Caveat",
  "Permanent Marker",
  "Abril Fatface",
  "Comfortaa",
  "Righteous",
  "Great Vibes",
  "Bangers",
  "Fredoka",
  "Baloo 2",
  "Cinzel",
  "Cormorant Garamond",
  "EB Garamond",
  "Libre Baskerville",
  "Bitter",
  "Arvo",
  "Zilla Slab",
  "Space Grotesk",
  "Sora",
  "Manrope",
  "Figtree",
  "Outfit",
  "Plus Jakarta Sans",
  "DM Sans",
  "DM Serif Display",
  "Kanit",
  "Prompt",
  "Mulish",
  "Karla",
  "Heebo",
  "Jost",
  "Lexend",
  "Albert Sans",
  "Fraunces",
  "Chivo",
  "Red Hat Display",
  "Urbanist",
  "Be Vietnam Pro",
  "Saira",
  "Cabin",
  "Varela Round",
  "Alfa Slab One",
  "Russo One",
  "Monoton",
  "Orbitron",
  "Audiowide",
  "Press Start 2P",
  "VT323",
];

const fontVariants = new Map<string, string[]>();
const loadedVariants = new Set<string>();
const previewLoaded = new Set<string>();
export const customFonts = new Set<string>();

function styleLabel(weight: number, italic: boolean): string {
  const base = WEIGHT_NAMES[weight] ?? String(weight);
  if (!italic) return base;
  return base === "Regular" ? "Italic" : `${base} Italic`;
}

function parseVariant(v: string): { weight: number; italic: boolean } {
  const italic = v.endsWith("italic");
  const w = v.replace("italic", "");
  const weight = w === "" || w === "regular" ? 400 : Number(w) || 400;
  return { weight, italic };
}

export function variantsFor(family: string): FontStyle[] {
  if (family === "Rosetta" || customFonts.has(family)) {
    return [{ weight: 400, italic: false, label: "Regular", value: "400:0" }];
  }
  const raw = fontVariants.get(family);
  const tokens = raw && raw.length ? raw : ["regular", "italic", "700", "700italic"];
  const seen = new Set<string>();
  const out: FontStyle[] = [];
  for (const v of tokens) {
    const { weight, italic } = parseVariant(v);
    const value = `${weight}:${italic ? 1 : 0}`;
    if (seen.has(value)) continue;
    seen.add(value);
    out.push({ weight, italic, label: styleLabel(weight, italic), value });
  }
  out.sort((a, b) => a.weight - b.weight || Number(a.italic) - Number(b.italic));
  return out;
}

/** The best default style for a role, from a family's variants. */
export function defaultStyle(family: string, role: "header" | "names"): string {
  const vs = variantsFor(family);
  const want =
    role === "header"
      ? (vs.find((v) => v.weight === 700 && !v.italic) ??
        [...vs].reverse().find((v) => !v.italic && v.weight <= 700) ??
        vs[0])
      : (vs.find((v) => v.weight === 400 && !v.italic) ?? vs.find((v) => !v.italic) ?? vs[0]);
  return want?.value ?? "400:0";
}

export async function loadFontList(): Promise<string[]> {
  const families: string[] = [];
  try {
    const res = await fetch(
      "https://cdn.jsdelivr.net/npm/google-fonts-complete@1.3.0/api-response.json",
    );
    if (res.ok) {
      const data = (await res.json()) as {
        items?: { family?: string; variants?: string[] }[];
      } & Record<string, unknown>;
      if (Array.isArray(data.items)) {
        for (const it of data.items) {
          if (!it?.family) continue;
          families.push(it.family);
          if (Array.isArray(it.variants)) fontVariants.set(it.family, it.variants);
        }
      } else {
        for (const [family, info] of Object.entries(data)) {
          if (family === "kind") continue;
          families.push(family);
          const v = (info as { variants?: unknown }).variants;
          if (Array.isArray(v)) fontVariants.set(family, v as string[]);
        }
      }
    }
  } catch {
    /* offline or blocked; the fallback set is used */
  }
  const set = new Set<string>([...FALLBACK_FONTS, ...families, ...customFonts]);
  return [...set].sort((a, b) => a.localeCompare(b));
}

function gfName(family: string): string {
  return family.replace(/ /g, "+");
}

export async function ensureVariant(
  family: string,
  weight: number,
  italic: boolean,
): Promise<void> {
  if (!family || family === "Rosetta" || customFonts.has(family)) return;
  const key = `${family}|${weight}|${italic ? 1 : 0}`;
  if (!loadedVariants.has(key)) {
    loadedVariants.add(key);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${gfName(family)}:ital,wght@${italic ? 1 : 0},${weight}&display=swap`;
    document.head.appendChild(link);
  }
  try {
    await document.fonts.load(`${italic ? "italic " : ""}${weight} 32px "${family}"`);
  } catch {
    /* fall back to the default font if it cannot load */
  }
}

export function ensurePreview(family: string): void {
  if (family === "Rosetta" || customFonts.has(family) || previewLoaded.has(family)) return;
  previewLoaded.add(family);
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${gfName(family)}&display=swap`;
  document.head.appendChild(link);
}

export function styleParts(value: string): { weight: number; italic: boolean } {
  const [w, i] = value.split(":");
  return { weight: Number(w) || 400, italic: i === "1" };
}
