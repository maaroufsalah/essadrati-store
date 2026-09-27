import type {
  ColorTokens,
  FontId,
  LocalizedString,
  ThemePresetId,
  ThemeRadius,
} from "@nocido/types";

export interface ThemePreset {
  id: ThemePresetId;
  name: LocalizedString;
  description: LocalizedString;
  light: ColorTokens;
  dark: ColorTokens;
  radius: ThemeRadius;
  fonts: { display: FontId; body: FontId };
}
