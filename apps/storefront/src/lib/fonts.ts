import type { FontId } from "@nocido/types";
import {
  Almarai,
  Amiri,
  Cairo,
  Changa,
  El_Messiri,
  IBM_Plex_Sans_Arabic,
  Lalezar,
  Noto_Kufi_Arabic,
  Noto_Naskh_Arabic,
  Readex_Pro,
  Reem_Kufi,
  Tajawal,
} from "next/font/google";

/*
 * Every font of the @nocido/theme catalog, self-hosted by next/font.
 * next/font only accepts literal options (no shared object, no spread), so
 * weights are repeated here: keep them in
 * sync with FONTS in packages/theme/src/fonts.ts (variable fonts need none).
 * `variable` must equal FONTS[id].cssVariable: the theme tokens reference it.
 * preload is off: only the two fonts the theme uses are requested by the
 * browser, through the @font-face rules their CSS variables point to.
 */
const amiri = Amiri({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-amiri",
});

const ibmPlexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: false,
  variable: "--font-ibm-plex-sans-arabic",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-noto-naskh-arabic",
});

const notoKufiArabic = Noto_Kufi_Arabic({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-noto-kufi-arabic",
});

const readexPro = Readex_Pro({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-readex-pro",
});

const cairo = Cairo({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-cairo",
});

const tajawal = Tajawal({
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  preload: false,
  variable: "--font-tajawal",
});

const almarai = Almarai({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  display: "swap",
  preload: false,
  variable: "--font-almarai",
});

const elMessiri = El_Messiri({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-el-messiri",
});

const reemKufi = Reem_Kufi({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-reem-kufi",
});

const changa = Changa({
  subsets: ["arabic", "latin"],
  display: "swap",
  preload: false,
  variable: "--font-changa",
});

const lalezar = Lalezar({
  subsets: ["arabic", "latin"],
  weight: "400",
  display: "swap",
  preload: false,
  variable: "--font-lalezar",
});

const FONT_CLASSES: Record<FontId, string> = {
  amiri: amiri.variable,
  "ibm-plex-sans-arabic": ibmPlexSansArabic.variable,
  "noto-naskh-arabic": notoNaskhArabic.variable,
  "noto-kufi-arabic": notoKufiArabic.variable,
  "readex-pro": readexPro.variable,
  cairo: cairo.variable,
  tajawal: tajawal.variable,
  almarai: almarai.variable,
  "el-messiri": elMessiri.variable,
  "reem-kufi": reemKufi.variable,
  changa: changa.variable,
  lalezar: lalezar.variable,
};

/** Class names defining the CSS variables of the fonts the theme uses. */
export function fontVariables(ids: readonly FontId[]): string {
  return [...new Set(ids)].map((id) => FONT_CLASSES[id]).join(" ");
}
