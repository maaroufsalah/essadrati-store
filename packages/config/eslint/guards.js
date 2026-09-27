// Kit guard rails for client-facing apps (storefront and mobile).
// They turn two project rules into lint errors:
//   1. Layout uses logical properties only, never physical left/right,
//      so RTL (ar) and LTR (fr, en) share the same markup.
//   2. No hard-coded colors or copy: colors come from theme tokens and
//      text from the i18n messages or StoreSettings.
import { defineConfig } from "eslint/config";

const variantPrefix = String.raw`(?:^|\s)(?:[a-z0-9\-&:@]+:)*!?-?`;
const physicalSpacing = String.raw`(?:m[lr]|p[lr]|left|right|border-[lr]|rounded-[lr]|rounded-[tb][lr]|scroll-[mp][lr])-`;
const physicalKeyword = String.raw`(?:text-(?:left|right)|float-(?:left|right)|clear-(?:left|right))(?:\s|$)`;
export const PHYSICAL_DIRECTION = new RegExp(
  `${variantPrefix}(?:${physicalSpacing}|${physicalKeyword})`,
);

const palette = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
  "black",
  "white",
].join("|");
const colorUtility = [
  "bg",
  "text",
  "border",
  "ring",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
  "outline",
  "decoration",
  "shadow",
  "divide",
  "accent",
  "caret",
  "placeholder",
].join("|");
export const PALETTE_COLOR = new RegExp(
  String.raw`(?:^|[\s:])(?:${colorUtility})-(?:${palette})(?:-\d{2,3})?(?:\s|$)`,
);
export const LITERAL_COLOR = new RegExp(
  String.raw`#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lch)\(`,
);
// Latin letters or the Arabic Unicode block.
const ARABIC_BLOCK = `${String.fromCodePoint(0x0600)}-${String.fromCodePoint(0x06ff)}`;
export const COPY_TEXT = new RegExp(`[A-Za-z${ARABIC_BLOCK}]`);

// esquery reads regex literals: the patterns above contain no "/".
const onStrings = (re) => [
  `Literal[value=/${re.source}/]`,
  `TemplateElement[value.raw=/${re.source}/]`,
];

const MESSAGES = {
  direction:
    "Use logical properties (ms/me, ps/pe, start/end, text-start/text-end) so RTL and LTR share the same markup.",
  palette: "Use theme tokens (bg-bg, text-fg, bg-primary...) instead of Tailwind palette colors.",
  literalColor: "No literal colors: every color comes from ThemeConfig tokens.",
  copy: "No hard-coded copy: use next-intl messages or StoreSettings.",
};

export const guardRules = {
  "no-restricted-syntax": [
    "error",
    ...onStrings(PHYSICAL_DIRECTION).map((selector) => ({ selector, message: MESSAGES.direction })),
    ...onStrings(PALETTE_COLOR).map((selector) => ({ selector, message: MESSAGES.palette })),
    ...onStrings(LITERAL_COLOR).map((selector) => ({ selector, message: MESSAGES.literalColor })),
    { selector: `JSXText[value=/${COPY_TEXT.source}/]`, message: MESSAGES.copy },
    {
      selector: `JSXAttribute[name.name=/^(alt|title|placeholder|aria-label|label)$/] > Literal[value=/${COPY_TEXT.source}/]`,
      message: MESSAGES.copy,
    },
  ],
};

export const guards = defineConfig({
  files: ["**/*.{ts,tsx}"],
  ignores: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}", "**/e2e/**"],
  rules: guardRules,
});

export default guards;
