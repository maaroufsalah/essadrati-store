import type { ThemePresetId } from "@nocido/types";
import { heritageDore } from "./heritage-dore";
import { minimalBlanc } from "./minimal-blanc";
import { nuitElegante } from "./nuit-elegante";
import { vertNature } from "./vert-nature";
import { bleuConfiance } from "./bleu-confiance";
import { roseDouce } from "./rose-douce";
import { terracotta } from "./terracotta";
import type { ThemePreset } from "./types";

export type { ThemePreset } from "./types";

/** Every preset, keyed by id. The type forces one entry per ThemePresetId. */
export const THEME_PRESETS: Record<ThemePresetId, ThemePreset> = {
  "heritage-dore": heritageDore,
  "minimal-blanc": minimalBlanc,
  "nuit-elegante": nuitElegante,
  "vert-nature": vertNature,
  "bleu-confiance": bleuConfiance,
  "rose-douce": roseDouce,
  terracotta: terracotta,
};

/** Presets in display order for the admin picker. */
export const THEME_PRESET_LIST: readonly ThemePreset[] = Object.values(THEME_PRESETS);

export function getPreset(id: ThemePresetId): ThemePreset {
  return THEME_PRESETS[id];
}
