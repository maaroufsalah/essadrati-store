import {
  COLOR_MODES,
  colorTokensSchema,
  FONT_IDS,
  publicStoreSettingsSchema,
  storeSettingsSchema,
  THEME_PRESET_IDS,
  type ThemeConfig,
} from "@nocido/types";
import { describe, expect, it } from "vitest";
import { contrastRatio, formatRatio } from "../color";
import { checkContrast, contrastReport } from "../contrast";
import {
  DEFAULT_PUBLIC_STORE_SETTINGS,
  DEFAULT_STORE_SETTINGS,
  DEFAULT_THEME_CONFIG,
} from "../defaults";
import { expoFontName, FONTS, fontStack, fontsForRole, googleFontsUrl } from "../fonts";
import { THEME_PRESETS } from "../presets";
import { colorVarName, generateTokens, generateTokensOrFallback } from "../tokens";

const withConfig = (patch: Partial<ThemeConfig>): ThemeConfig => ({
  ...DEFAULT_THEME_CONFIG,
  ...patch,
});

describe("contrast math", () => {
  it("matches WCAG reference values", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5);
    expect(contrastRatio("#777777", "#777777")).toBe(1);
    expect(formatRatio(contrastRatio("#767676", "#FFFFFF"))).toBe("4.54");
  });

  it("never rounds a failing ratio up to the threshold", () => {
    expect(formatRatio(4.4999)).toBe("4.49");
  });
});

describe("presets", () => {
  it("ships one preset per id", () => {
    expect(Object.keys(THEME_PRESETS).sort()).toEqual([...THEME_PRESET_IDS].sort());
  });

  const cases = THEME_PRESET_IDS.flatMap((id) => COLOR_MODES.map((mode) => [id, mode] as const));

  it.each(cases)("%s %s defines every token as a valid hex color", (id, mode) => {
    expect(colorTokensSchema.safeParse(THEME_PRESETS[id][mode]).success).toBe(true);
  });

  it.each(cases)("%s %s passes WCAG AA on every pair", (id, mode) => {
    const failing = checkContrast(THEME_PRESETS[id][mode], mode).map(
      (issue) => `${issue.foreground}/${issue.background} ${formatRatio(issue.ratio)}`,
    );
    expect(failing).toEqual([]);
  });

  it.each(THEME_PRESET_IDS)("%s has dedicated dark tokens, not a copy of light", (id) => {
    const { light, dark } = THEME_PRESETS[id];
    expect(dark.bg).not.toBe(light.bg);
    expect(dark.fg).not.toBe(light.fg);
  });

  it.each(THEME_PRESET_IDS)("%s names itself in every locale", (id) => {
    const { name } = THEME_PRESETS[id];
    expect(name.ar && name.fr && name.en).toBeTruthy();
  });

  it("uses the Essadrati brand colors for the default preset", () => {
    const { light } = THEME_PRESETS["heritage-dore"];
    expect([light.bg, light.fg, light.primary]).toEqual(["#F7F1E6", "#2B1B0E", "#E9B44C"]);
  });

  it("reports every pair for the admin", () => {
    const report = contrastReport(THEME_PRESETS["heritage-dore"].light, "light");
    expect(report.length).toBeGreaterThan(10);
    expect(report.every((row) => row.pass)).toBe(true);
  });
});

describe("generateTokens", () => {
  it("generates :root and .dark blocks", () => {
    const result = generateTokens(DEFAULT_THEME_CONFIG);
    if (!result.ok) throw new Error("default theme must pass");
    const { css } = result.tokens;
    expect(css).toMatch(/^:root\{--color-bg:#F7F1E6;/);
    expect(css).toContain("--color-card-fg:#2B1B0E");
    expect(css).toContain("--radius-card:24px");
    expect(css).toContain("--radius-button:9999px");
    expect(css).toContain('--font-display:var(--font-amiri), "Amiri", serif');
    expect(css).toContain("color-scheme:light");
    expect(css).toMatch(/\.dark\{--color-bg:#1A120A;.*color-scheme:dark\}$/);
  });

  it("maps camelCase tokens to kebab-case variables", () => {
    expect(colorVarName("primaryFg")).toBe("--color-primary-fg");
    expect(colorVarName("bg")).toBe("--color-bg");
  });

  it("applies light and dark overrides separately", () => {
    const result = generateTokens(
      withConfig({ overrides: { light: { primary: "#F2C14E" }, dark: { bg: "#120C06" } } }),
    );
    if (!result.ok) throw new Error("override must pass");
    expect(result.tokens.colors.light.primary).toBe("#F2C14E");
    expect(result.tokens.colors.dark.primary).toBe("#E9B44C");
    expect(result.tokens.colors.dark.bg).toBe("#120C06");
  });

  it("refuses overrides under 4.5:1 and says which pair fails", () => {
    const result = generateTokens(
      withConfig({ overrides: { light: { fg: "#D9D0C0" }, dark: {} } }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ mode: "light", foreground: "fg", background: "bg" }),
      ]),
    );
  });

  it("refuses anything that is not a validated hex color", () => {
    const hostile = withConfig({
      overrides: { light: { bg: "#FFF;}body{display:none" }, dark: {} },
    });
    expect(() => generateTokens(hostile)).toThrow();
  });

  it("exports NativeWind variables and Expo font names", () => {
    const result = generateTokens(DEFAULT_THEME_CONFIG);
    if (!result.ok) throw new Error("default theme must pass");
    const { native } = result.tokens;
    expect(native.vars.dark["--color-bg"]).toBe("#1A120A");
    expect(native.radius).toEqual({ base: 12, card: 24, button: 9999 });
    expect(native.fonts.display.bold).toBe("Amiri_700Bold");
    expect(native.fonts.body.medium).toBe("IBMPlexSansArabic_500Medium");
  });
});

describe("generateTokensOrFallback", () => {
  it("drops overrides that break contrast and keeps the preset", () => {
    const tokens = generateTokensOrFallback(
      withConfig({ overrides: { light: { fg: "#F7F1E6" }, dark: {} } }),
      DEFAULT_THEME_CONFIG,
    );
    expect(tokens.colors.light.fg).toBe("#2B1B0E");
  });

  it("uses the fallback config when the input cannot be parsed", () => {
    const tokens = generateTokensOrFallback({ presetId: "unknown" }, DEFAULT_THEME_CONFIG);
    expect(tokens.colors.light.bg).toBe("#F7F1E6");
  });
});

describe("fonts", () => {
  it("describes every font id", () => {
    expect(Object.keys(FONTS).sort()).toEqual([...FONT_IDS].sort());
  });

  it("offers display and body fonts", () => {
    expect(fontsForRole("display").map((font) => font.id)).toContain("amiri");
    expect(fontsForRole("body").map((font) => font.id)).toContain("ibm-plex-sans-arabic");
  });

  it("builds stacks and URLs", () => {
    expect(fontStack("readex-pro")).toBe('var(--font-readex-pro), "Readex Pro", sans-serif');
    expect(googleFontsUrl(["amiri", "amiri"])).toBe(
      "https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap",
    );
  });

  it("falls back to an available weight for Expo", () => {
    expect(expoFontName("lalezar", 700)).toBe("Lalezar_400Regular");
  });
});

describe("defaults", () => {
  it("are valid settings", () => {
    expect(storeSettingsSchema.safeParse(DEFAULT_STORE_SETTINGS).success).toBe(true);
    expect(publicStoreSettingsSchema.safeParse(DEFAULT_PUBLIC_STORE_SETTINGS).success).toBe(true);
  });

  it("default to Héritage doré with Amiri and IBM Plex Sans Arabic", () => {
    expect(DEFAULT_THEME_CONFIG.presetId).toBe("heritage-dore");
    expect(DEFAULT_THEME_CONFIG.fonts).toEqual({ display: "amiri", body: "ibm-plex-sans-arabic" });
  });

  it("match the preset radius and fonts", () => {
    const preset = THEME_PRESETS[DEFAULT_THEME_CONFIG.presetId];
    expect(DEFAULT_THEME_CONFIG.radius).toEqual(preset.radius);
    expect(DEFAULT_THEME_CONFIG.fonts).toEqual(preset.fonts);
  });
});
