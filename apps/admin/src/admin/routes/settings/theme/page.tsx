import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Swatch } from "@medusajs/icons";
import { Badge, Button, Input, Label, Tabs, Text, clx } from "@medusajs/ui";
import {
  FONTS,
  fontsForRole,
  getPreset,
  googleFontsUrl,
  THEME_PRESET_LIST,
  type ThemePreset,
} from "@nocido/theme";
import {
  COLOR_MODES,
  COLOR_TOKENS,
  type ColorMode,
  type ColorToken,
  type ThemeConfig,
  themeConfigSchema,
} from "@nocido/types";
import { useEffect } from "react";
import { type UseFormReturn, useWatch } from "react-hook-form";
import { z } from "zod";
import { Grid, NumberField, RadioField, Section, SelectField } from "../../../components/fields";
import { type FormValues, SettingsForm } from "../../../components/settings-form";
import { contrastIssues, ThemePreview } from "../../../components/theme-preview";
import { refreshBranding } from "../../../lib/branding";
import { currentLanguage, t } from "../../../lib/i18n";

/** The form edits `theme`; a pill toggle stands in for radius.button = "pill". */
const schema = z.object({ theme: themeConfigSchema }).superRefine((value, ctx) => {
  if (contrastIssues(value.theme).length > 0) {
    ctx.addIssue({ code: "custom", path: ["theme", "overrides"], message: "theme.contrast" });
  }
});

/** Loads the Google Fonts CSS of the selected fonts, for the admin preview only. */
function usePreviewFonts(config: ThemeConfig | null) {
  const href = config ? googleFontsUrl([config.fonts.display, config.fonts.body]) : null;
  useEffect(() => {
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
}

function presetName(preset: ThemePreset): string {
  return preset.name[currentLanguage()] ?? preset.name.fr ?? preset.id;
}

function PresetSwatch({ preset, mode }: { preset: ThemePreset; mode: ColorMode }) {
  const colors = preset[mode];
  return (
    <div
      className="flex h-14 flex-1 flex-col justify-between rounded-md border p-2"
      style={{ background: colors.bg, borderColor: colors.border }}
    >
      <span className="h-2 w-10 rounded-full" style={{ background: colors.fg }} />
      <div className="flex gap-1">
        <span className="h-3 w-6 rounded-full" style={{ background: colors.primary }} />
        <span className="h-3 w-3 rounded-full" style={{ background: colors.accent }} />
        <span className="h-3 w-3 rounded-full" style={{ background: colors.card }} />
      </div>
    </div>
  );
}

function PresetGallery({ form }: { form: UseFormReturn<FormValues> }) {
  const presetId = useWatch({ control: form.control, name: "theme.presetId" }) as string;
  const choose = (preset: ThemePreset) => {
    const options = { shouldDirty: true, shouldValidate: true };
    form.setValue("theme.presetId", preset.id, options);
    form.setValue("theme.overrides", { light: {}, dark: {} }, options);
    form.setValue("theme.fonts", preset.fonts, options);
    form.setValue("theme.radius", preset.radius, options);
  };
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
      {THEME_PRESET_LIST.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => choose(preset)}
          aria-pressed={presetId === preset.id}
          className={clx(
            "flex flex-col gap-2 rounded-lg border p-3 text-start transition-colors",
            presetId === preset.id
              ? "border-ui-border-interactive ring-ui-border-interactive ring-1"
              : "border-ui-border-base hover:bg-ui-bg-base-hover",
          )}
        >
          <div className="flex gap-2">
            {COLOR_MODES.map((mode) => (
              <PresetSwatch key={mode} preset={preset} mode={mode} />
            ))}
          </div>
          <Text size="small" weight="plus">
            {presetName(preset)}
          </Text>
          <Text size="xsmall" className="text-ui-fg-subtle">
            {`${FONTS[preset.fonts.display].family} · ${FONTS[preset.fonts.body].family}`}
          </Text>
        </button>
      ))}
    </div>
  );
}

const HEX = /^#[0-9a-fA-F]{6}$/;

function TokenRow({
  form,
  mode,
  token,
}: {
  form: UseFormReturn<FormValues>;
  mode: ColorMode;
  token: ColorToken;
}) {
  const name = `theme.overrides.${mode}.${token}`;
  const presetId = useWatch({
    control: form.control,
    name: "theme.presetId",
  }) as ThemeConfig["presetId"];
  const override = useWatch({ control: form.control, name }) as string | undefined;
  const base = getPreset(presetId)[mode][token];
  const value = override ?? base;
  const set = (next: string | undefined) =>
    form.setValue(name, next, { shouldDirty: true, shouldValidate: true });
  const id = `${mode}-${token}`;

  return (
    <div className="flex flex-wrap items-center gap-3 py-1">
      <input
        type="color"
        aria-label={token}
        value={HEX.test(value) ? value.toLowerCase() : "#000000"}
        onChange={(event) => set(event.target.value.toUpperCase())}
        className="border-ui-border-base h-8 w-10 cursor-pointer rounded border bg-transparent"
      />
      <Label htmlFor={id} size="small" className="w-24 font-mono">
        {token}
      </Label>
      <Input
        id={id}
        size="small"
        dir="ltr"
        className="w-28 font-mono"
        value={value}
        onChange={(event) => {
          const next = event.target.value.trim();
          set(next.toUpperCase() === base ? undefined : next.toUpperCase());
        }}
      />
      {override !== undefined ? (
        <>
          <Badge size="2xsmall" color="blue">
            {t("theme.override")}
          </Badge>
          <Button type="button" size="small" variant="transparent" onClick={() => set(undefined)}>
            {t("theme.resetToken")}
          </Button>
        </>
      ) : null}
    </div>
  );
}

function TokenEditor({ form }: { form: UseFormReturn<FormValues> }) {
  return (
    <Tabs defaultValue="light">
      <Tabs.List>
        {COLOR_MODES.map((mode) => (
          <Tabs.Trigger key={mode} value={mode}>
            {t(mode === "light" ? "theme.light" : "theme.dark")}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      {COLOR_MODES.map((mode) => (
        <Tabs.Content key={mode} value={mode} className="pt-3">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {COLOR_TOKENS.map((token) => (
              <TokenRow key={token} form={form} mode={mode} token={token} />
            ))}
          </div>
        </Tabs.Content>
      ))}
    </Tabs>
  );
}

function ButtonRadius({ form }: { form: UseFormReturn<FormValues> }) {
  const button = useWatch({ control: form.control, name: "theme.radius.button" }) as
    "pill" | number;
  const pill = button === "pill";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <input
          id="theme-pill"
          type="checkbox"
          checked={pill}
          onChange={(event) =>
            form.setValue("theme.radius.button", event.target.checked ? "pill" : 12, {
              shouldDirty: true,
              shouldValidate: true,
            })
          }
        />
        <Label htmlFor="theme-pill" size="small">
          {t("theme.radiusPill")}
        </Label>
      </div>
      {pill ? null : (
        <NumberField name="theme.radius.button" label={t("theme.radiusButton")} min={0} max={32} />
      )}
    </div>
  );
}

const fontOptions = (role: "display" | "body") =>
  fontsForRole(role).map((font) => ({ value: font.id, label: font.family }));

function Preview({ values }: { values: FormValues }) {
  const parsed = themeConfigSchema.safeParse((values as { theme?: unknown }).theme);
  usePreviewFonts(parsed.success ? parsed.data : null);
  return parsed.success ? <ThemePreview config={parsed.data} /> : null;
}

const ThemeSettingsPage = () => (
  <SettingsForm
    title={t("theme.title")}
    description={t("theme.description")}
    schema={schema}
    pick={(settings) => ({ theme: settings.theme })}
    afterSave={refreshBranding}
    aside={(values) => <Preview values={values} />}
  >
    {(form) => (
      <>
        <Section title={t("theme.presets")}>
          <PresetGallery form={form} />
        </Section>
        <Section title={t("theme.colors")}>
          <TokenEditor form={form} />
        </Section>
        <Section title={t("theme.fonts")}>
          <Grid>
            <SelectField
              name="theme.fonts.display"
              label={t("theme.fontDisplay")}
              options={fontOptions("display")}
            />
            <SelectField
              name="theme.fonts.body"
              label={t("theme.fontBody")}
              options={fontOptions("body")}
            />
          </Grid>
        </Section>
        <Section title={t("theme.radius")}>
          <Grid>
            <NumberField name="theme.radius.base" label={t("theme.radiusBase")} min={0} max={32} />
            <NumberField name="theme.radius.card" label={t("theme.radiusCard")} min={0} max={48} />
          </Grid>
          <ButtonRadius form={form} />
        </Section>
        <Section title={t("theme.defaultMode")}>
          <RadioField
            name="theme.defaultMode"
            label={t("theme.defaultMode")}
            options={(["system", "light", "dark"] as const).map((mode) => ({
              value: mode,
              label: t(`theme.mode.${mode}`),
            }))}
          />
        </Section>
      </>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("theme.label"), icon: Swatch });

export default ThemeSettingsPage;
