import { colorVarName, fontStack, PILL_RADIUS, resolveColors } from "@nocido/theme";
import {
  COLOR_TOKENS,
  directionOf,
  type Locale,
  type LocalizedString,
  type MediaRef,
  resolveLocalized,
  type TextAlign,
  type ThemeConfig,
} from "@nocido/types";
import type { CSSProperties, ReactNode } from "react";

export type PreviewMode = "desktop" | "mobile";

const v = (name: string) => `var(--${name})`;

/**
 * Storefront slides and banners force the dark tokens of the theme (light
 * text over a darkened image): the preview does the same.
 */
function darkVars(theme: ThemeConfig): CSSProperties {
  const colors = resolveColors(theme, "dark");
  const button = theme.radius.button === "pill" ? PILL_RADIUS : theme.radius.button;
  return {
    ...Object.fromEntries(COLOR_TOKENS.map((token) => [colorVarName(token), colors[token]])),
    "--radius-card": `${theme.radius.card}px`,
    "--radius-button": `${button}px`,
    "--font-display": fontStack(theme.fonts.display),
    "--font-body": fontStack(theme.fonts.body),
  } as CSSProperties;
}

function PreviewImage({ media }: { media: MediaRef | null }) {
  return media ? (
    <img
      src={media.url}
      alt=""
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
    />
  ) : null;
}

const JUSTIFY: Record<TextAlign, CSSProperties["alignItems"]> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
};

interface SlidePreviewProps {
  theme: ThemeConfig;
  mode: PreviewMode;
  locale: Locale;
  imageDesktop: MediaRef | null;
  imageMobile: MediaRef | null;
  title: LocalizedString;
  subtitle: LocalizedString;
  ctaLabel: LocalizedString;
  textAlign: TextAlign;
  overlay: number;
}

/** Hero slide as the storefront lays it out: 1920x900 frame on desktop, 4:5 on phones. */
export function SlidePreview(props: SlidePreviewProps) {
  const { theme, mode, locale } = props;
  const mobile = mode === "mobile";
  const media = mobile
    ? (props.imageMobile ?? props.imageDesktop)
    : (props.imageDesktop ?? props.imageMobile);
  const title = resolveLocalized(props.title, locale);
  const subtitle = resolveLocalized(props.subtitle, locale);
  const cta = resolveLocalized(props.ctaLabel, locale);
  const align = JUSTIFY[props.textAlign];

  return (
    <div
      dir={directionOf(locale)}
      lang={locale}
      style={{
        ...darkVars(theme),
        position: "relative",
        overflow: "hidden",
        width: mobile ? 260 : "100%",
        aspectRatio: mobile ? "4 / 5" : "1920 / 900",
        margin: mobile ? "0 auto" : undefined,
        borderRadius: 12,
        background: v("color-bg"),
        color: v("color-fg"),
        fontFamily: v("font-body"),
      }}
    >
      <PreviewImage media={media} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: v("color-bg"),
          opacity: props.overlay / 100,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: mobile ? "flex-end" : "center",
          alignItems: align,
          textAlign: props.textAlign,
          gap: mobile ? 8 : 10,
          padding: mobile ? "16px 16px 28px" : "0 8%",
        }}
      >
        {title ? (
          <div
            style={{
              fontFamily: v("font-display"),
              fontWeight: 700,
              fontSize: mobile ? 22 : 30,
              lineHeight: 1.15,
              maxWidth: "70%",
              minWidth: mobile ? "100%" : undefined,
            }}
          >
            {title}
          </div>
        ) : null}
        {subtitle ? (
          <div
            style={{ fontSize: mobile ? 11 : 13, opacity: 0.85, maxWidth: mobile ? "100%" : "55%" }}
          >
            {subtitle}
          </div>
        ) : null}
        {cta ? (
          <span
            style={{
              marginTop: 4,
              background: v("color-primary"),
              color: v("color-primary-fg"),
              borderRadius: v("radius-button"),
              padding: mobile ? "6px 14px" : "8px 18px",
              fontSize: mobile ? 11 : 13,
              fontWeight: 600,
            }}
          >
            {cta}
          </span>
        ) : null}
      </div>
    </div>
  );
}

interface BannerPreviewProps {
  theme: ThemeConfig;
  mode: PreviewMode;
  locale: Locale;
  imageDesktop: MediaRef | null;
  imageMobile: MediaRef | null;
  title: LocalizedString;
  tagline: LocalizedString;
  /** Resolved button text (the banner's own, or the storefront default). */
  cta: ReactNode;
}

/** Category banner card: 4:5 on desktop, square on phones. */
export function BannerPreview(props: BannerPreviewProps) {
  const { theme, mode, locale } = props;
  const mobile = mode === "mobile";
  const media = mobile
    ? (props.imageMobile ?? props.imageDesktop)
    : (props.imageDesktop ?? props.imageMobile);
  const title = resolveLocalized(props.title, locale);
  const tagline = resolveLocalized(props.tagline, locale);

  return (
    <div
      dir={directionOf(locale)}
      lang={locale}
      style={{
        ...darkVars(theme),
        position: "relative",
        overflow: "hidden",
        width: mobile ? 260 : 280,
        aspectRatio: mobile ? "1 / 1" : "4 / 5",
        margin: "0 auto",
        borderRadius: v("radius-card"),
        background: v("color-bg"),
        color: v("color-fg"),
        fontFamily: v("font-body"),
      }}
    >
      <PreviewImage media={media} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(to top, color-mix(in oklab, ${v("color-bg")} 85%, transparent), transparent)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          insetInline: 0,
          bottom: 0,
          padding: 18,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          gap: 6,
        }}
      >
        {title ? (
          <div style={{ fontFamily: v("font-display"), fontWeight: 700, fontSize: 24 }}>
            {title}
          </div>
        ) : null}
        {tagline ? <div style={{ fontSize: 12, opacity: 0.85 }}>{tagline}</div> : null}
        <span
          style={{
            marginTop: 4,
            background: v("color-fg"),
            color: v("color-bg"),
            borderRadius: PILL_RADIUS,
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {props.cta}
        </span>
      </div>
    </div>
  );
}
