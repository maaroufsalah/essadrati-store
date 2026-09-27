import type { ColorMode, ColorToken, ColorTokens } from "@nocido/types";
import { contrastRatio } from "./color";

/** WCAG AA thresholds. */
export const TEXT_CONTRAST = 4.5;
export const UI_CONTRAST = 3;

export interface ContrastPair {
  foreground: ColorToken;
  background: ColorToken;
  min: number;
}

/**
 * Every foreground/background pair the kit components use.
 * Token semantics:
 * - fg on bg, cardFg on card: body text.
 * - primaryFg on primary, accentFg on accent: text on filled buttons and badges.
 * - accent on bg and card: links and emphasized text.
 * - mutedFg on muted, bg and card: secondary text.
 * - success, warning, danger on bg and card: status messages.
 * - ring on bg: focus indicator (non-text, 3:1).
 * Primary is only used as a fill, never as text on bg, so primary on bg is
 * not checked: a gold button on cream stays legal as long as its label passes.
 */
export const CONTRAST_PAIRS: readonly ContrastPair[] = [
  { foreground: "fg", background: "bg", min: TEXT_CONTRAST },
  { foreground: "fg", background: "card", min: TEXT_CONTRAST },
  { foreground: "cardFg", background: "card", min: TEXT_CONTRAST },
  { foreground: "primaryFg", background: "primary", min: TEXT_CONTRAST },
  { foreground: "accentFg", background: "accent", min: TEXT_CONTRAST },
  { foreground: "accent", background: "bg", min: TEXT_CONTRAST },
  { foreground: "accent", background: "card", min: TEXT_CONTRAST },
  { foreground: "mutedFg", background: "muted", min: TEXT_CONTRAST },
  { foreground: "mutedFg", background: "bg", min: TEXT_CONTRAST },
  { foreground: "mutedFg", background: "card", min: TEXT_CONTRAST },
  { foreground: "success", background: "bg", min: TEXT_CONTRAST },
  { foreground: "success", background: "card", min: TEXT_CONTRAST },
  { foreground: "warning", background: "bg", min: TEXT_CONTRAST },
  { foreground: "warning", background: "card", min: TEXT_CONTRAST },
  { foreground: "danger", background: "bg", min: TEXT_CONTRAST },
  { foreground: "danger", background: "card", min: TEXT_CONTRAST },
  { foreground: "ring", background: "bg", min: UI_CONTRAST },
];

export interface ContrastIssue extends ContrastPair {
  mode: ColorMode;
  ratio: number;
}

export function checkContrast(colors: ColorTokens, mode: ColorMode): ContrastIssue[] {
  return CONTRAST_PAIRS.flatMap((pair) => {
    const ratio = contrastRatio(colors[pair.foreground], colors[pair.background]);
    return ratio < pair.min ? [{ ...pair, mode, ratio }] : [];
  });
}

/** All pairs with their ratio, for the admin contrast report. */
export function contrastReport(
  colors: ColorTokens,
  mode: ColorMode,
): (ContrastPair & { mode: ColorMode; ratio: number; pass: boolean })[] {
  return CONTRAST_PAIRS.map((pair) => {
    const ratio = contrastRatio(colors[pair.foreground], colors[pair.background]);
    return { ...pair, mode, ratio, pass: ratio >= pair.min };
  });
}
