import type { FontId } from "@nocido/types";

export type FontRole = "display" | "body";

export interface FontDefinition {
  id: FontId;
  /** Google Fonts family name. */
  family: string;
  /** Generic fallback appended to the stack. */
  fallback: "serif" | "sans-serif";
  /** Roles the admin offers this font for. */
  roles: readonly FontRole[];
  /** Weights loaded by the storefront and the mobile app. */
  weights: readonly number[];
  /**
   * CSS variable set by next/font in the storefront. The storefront font
   * loader must use exactly this name.
   */
  cssVariable: `--font-${FontId}`;
}

const font = (
  id: FontId,
  family: string,
  fallback: FontDefinition["fallback"],
  roles: readonly FontRole[],
  weights: readonly number[],
): FontDefinition => ({ id, family, fallback, roles, weights, cssVariable: `--font-${id}` });

/**
 * Curated Google Fonts with full Arabic and Latin support.
 * The Record type forces an entry for every FontId declared in @nocido/types.
 */
export const FONTS: Record<FontId, FontDefinition> = {
  amiri: font("amiri", "Amiri", "serif", ["display", "body"], [400, 700]),
  "ibm-plex-sans-arabic": font(
    "ibm-plex-sans-arabic",
    "IBM Plex Sans Arabic",
    "sans-serif",
    ["body", "display"],
    [400, 500, 600, 700],
  ),
  "noto-naskh-arabic": font(
    "noto-naskh-arabic",
    "Noto Naskh Arabic",
    "serif",
    ["body"],
    [400, 500, 600, 700],
  ),
  "noto-kufi-arabic": font(
    "noto-kufi-arabic",
    "Noto Kufi Arabic",
    "sans-serif",
    ["body", "display"],
    [400, 500, 600, 700],
  ),
  "readex-pro": font(
    "readex-pro",
    "Readex Pro",
    "sans-serif",
    ["body", "display"],
    [400, 500, 600, 700],
  ),
  cairo: font("cairo", "Cairo", "sans-serif", ["body", "display"], [400, 500, 600, 700]),
  tajawal: font("tajawal", "Tajawal", "sans-serif", ["body"], [400, 500, 700]),
  almarai: font("almarai", "Almarai", "sans-serif", ["body"], [400, 700]),
  "el-messiri": font("el-messiri", "El Messiri", "sans-serif", ["display"], [400, 500, 600, 700]),
  "reem-kufi": font("reem-kufi", "Reem Kufi", "sans-serif", ["display"], [400, 500, 600, 700]),
  changa: font("changa", "Changa", "sans-serif", ["display"], [400, 500, 600, 700]),
  lalezar: font("lalezar", "Lalezar", "sans-serif", ["display"], [400]),
};

export const FONT_LIST: readonly FontDefinition[] = Object.values(FONTS);

export function fontsForRole(role: FontRole): FontDefinition[] {
  return FONT_LIST.filter((definition) => definition.roles.includes(role));
}

/** CSS font-family stack: the next/font variable first, then the family name. */
export function fontStack(id: FontId): string {
  const definition = FONTS[id];
  return `var(${definition.cssVariable}), "${definition.family}", ${definition.fallback}`;
}

/** Google Fonts CSS2 URL, used by the admin live preview. */
export function googleFontsUrl(ids: readonly FontId[]): string {
  const families = [...new Set(ids)].map((id) => {
    const definition = FONTS[id];
    const name = definition.family.replace(/ /g, "+");
    return `family=${name}:wght@${definition.weights.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
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

/**
 * Font family name registered by @expo-google-fonts in the mobile app,
 * e.g. ("amiri", 700) -> "Amiri_700Bold".
 */
export function expoFontName(id: FontId, weight = 400): string {
  const definition = FONTS[id];
  const available = definition.weights.includes(weight) ? weight : (definition.weights[0] ?? 400);
  return `${definition.family.replace(/ /g, "")}_${available}${WEIGHT_NAMES[available] ?? "Regular"}`;
}
