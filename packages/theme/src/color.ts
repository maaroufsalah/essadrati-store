import type { HexColor } from "@nocido/types";

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

/** Parses #RRGGBB. Throws on anything else: colors are validated upstream. */
export function hexToRgb(hex: HexColor): Rgb {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) throw new Error(`Invalid hex color: ${hex}`);
  const [, r = "0", g = "0", b = "0"] = match;
  return { r: parseInt(r, 16), g: parseInt(g, 16), b: parseInt(b, 16) };
}

/** WCAG 2.x relative luminance. */
export function relativeLuminance(hex: HexColor): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number): number => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, from 1 to 21. */
export function contrastRatio(a: HexColor, b: HexColor): number {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [light, dark] = la > lb ? [la, lb] : [lb, la];
  return (light + 0.05) / (dark + 0.05);
}

/** Rounded down to two decimals, so 4.499 never displays as 4.5. */
export function formatRatio(ratio: number): string {
  return (Math.floor(ratio * 100) / 100).toFixed(2);
}
