import { Badge, Container, Heading, Text } from "@medusajs/ui";
import {
  checkContrast,
  colorVarName,
  type ContrastIssue,
  fontStack,
  formatRatio,
  PILL_RADIUS,
  resolveColors,
} from "@nocido/theme";
import { COLOR_MODES, COLOR_TOKENS, type ColorMode, type ThemeConfig } from "@nocido/types";
import type { CSSProperties } from "react";
import { t } from "../lib/i18n";

/** CSS variables for one mode, scoped to the preview element. */
function previewVars(config: ThemeConfig, mode: ColorMode): CSSProperties {
  const colors = resolveColors(config, mode);
  const button = config.radius.button === "pill" ? PILL_RADIUS : config.radius.button;
  return {
    ...Object.fromEntries(COLOR_TOKENS.map((token) => [colorVarName(token), colors[token]])),
    "--radius-base": `${config.radius.base}px`,
    "--radius-card": `${config.radius.card}px`,
    "--radius-button": `${button}px`,
    "--font-display": fontStack(config.fonts.display),
    "--font-body": fontStack(config.fonts.body),
  } as CSSProperties;
}

const v = (name: string) => `var(--${name})`;

/** Header, product card and buttons rendered with the theme tokens, in one mode. */
function MiniStore({ config, mode }: { config: ThemeConfig; mode: ColorMode }) {
  return (
    <div
      style={{
        ...previewVars(config, mode),
        background: v("color-bg"),
        color: v("color-fg"),
        fontFamily: v("font-body"),
        borderRadius: 12,
        overflow: "hidden",
        border: `1px solid ${v("color-border")}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderBottom: `1px solid ${v("color-border")}`,
        }}
      >
        <span style={{ fontFamily: v("font-display"), fontWeight: 700, fontSize: 18 }}>
          {t("theme.previewProduct")}
        </span>
        <span style={{ fontSize: 12, color: v("color-muted-fg") }}>{t("theme.previewNav")}</span>
      </div>
      <div style={{ padding: 14, display: "grid", gap: 12 }}>
        <div
          style={{
            background: v("color-card"),
            color: v("color-card-fg"),
            borderRadius: v("radius-card"),
            border: `1px solid ${v("color-border")}`,
            overflow: "hidden",
          }}
        >
          <div style={{ height: 72, background: v("color-muted") }} />
          <div style={{ padding: 12, display: "grid", gap: 6 }}>
            <span style={{ fontFamily: v("font-display"), fontWeight: 700 }}>
              {t("theme.previewProduct")}
            </span>
            <span style={{ fontSize: 13, color: v("color-muted-fg") }}>
              {t("theme.previewPrice")}
            </span>
            <button
              type="button"
              tabIndex={-1}
              style={{
                background: v("color-primary"),
                color: v("color-primary-fg"),
                borderRadius: v("radius-button"),
                padding: "8px 14px",
                fontWeight: 600,
                border: "none",
              }}
            >
              {t("theme.previewCta")}
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              background: v("color-accent"),
              color: v("color-accent-fg"),
              borderRadius: v("radius-base"),
              padding: "2px 8px",
              fontSize: 12,
            }}
          >
            {t("theme.previewLink")}
          </span>
          {(["success", "warning", "danger"] as const).map((status) => (
            <span
              key={status}
              style={{ width: 14, height: 14, borderRadius: 999, background: v(`color-${status}`) }}
            />
          ))}
          <span
            style={{
              outline: `2px solid ${v("color-ring")}`,
              outlineOffset: 2,
              borderRadius: v("radius-base"),
              padding: "0 6px",
              fontSize: 12,
            }}
          >
            {t("theme.previewLink")}
          </span>
        </div>
      </div>
    </div>
  );
}

export function contrastIssues(config: ThemeConfig): ContrastIssue[] {
  return COLOR_MODES.flatMap((mode) => checkContrast(resolveColors(config, mode), mode));
}

/** Live preview in light and dark, with the WCAG report. */
export function ThemePreview({ config }: { config: ThemeConfig }) {
  const issues = contrastIssues(config);
  return (
    <Container className="flex flex-col gap-4 px-6 py-4">
      <Heading level="h2">{t("theme.preview")}</Heading>
      {COLOR_MODES.map((mode) => (
        <div key={mode} className="flex flex-col gap-2">
          <Text size="small" weight="plus">
            {t(mode === "light" ? "theme.light" : "theme.dark")}
          </Text>
          <MiniStore config={config} mode={mode} />
        </div>
      ))}
      {issues.length === 0 ? (
        <Badge color="green" size="small">
          {t("theme.contrastOk")}
        </Badge>
      ) : (
        <div className="flex flex-col gap-2" role="alert">
          <Badge color="red" size="small">
            {t("theme.contrastFailed")}
          </Badge>
          <ul className="flex flex-col gap-1">
            {issues.map((issue) => (
              <li key={`${issue.mode}-${issue.foreground}-${issue.background}`}>
                <Text size="small" className="text-ui-fg-error">
                  {`${t(issue.mode === "light" ? "theme.light" : "theme.dark")} · `}
                  {t("theme.contrastPair", {
                    fg: issue.foreground,
                    bg: issue.background,
                    ratio: formatRatio(issue.ratio),
                    min: issue.min,
                  })}
                </Text>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Container>
  );
}
