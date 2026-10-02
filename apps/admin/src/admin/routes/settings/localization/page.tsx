import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Language } from "@medusajs/icons";
import { LOCALES, localizationSchema } from "@nocido/types";
import { z } from "zod";
import {
  CheckboxGroupField,
  Grid,
  RadioField,
  Section,
  SelectField,
  TextField,
} from "../../../components/fields";
import { SettingsForm } from "../../../components/settings-form";
import { localeLabel, t } from "../../../lib/i18n";

const schema = z
  .object({ localization: localizationSchema })
  .refine((value) => value.localization.enabledLocales.includes(value.localization.defaultLocale), {
    path: ["localization", "enabledLocales"],
    message: "localization.defaultNotEnabled",
  });

const localeOptions = LOCALES.map((locale) => ({ value: locale, label: localeLabel(locale) }));

const LocalizationSettingsPage = () => (
  <SettingsForm
    title={t("localization.title")}
    description={t("localization.description")}
    schema={schema}
    pick={(settings) => ({ localization: settings.localization })}
  >
    {() => (
      <Section title={t("localization.title")}>
        <Grid>
          <SelectField
            name="localization.defaultLocale"
            label={t("localization.defaultLocale")}
            options={localeOptions}
          />
          <CheckboxGroupField
            name="localization.enabledLocales"
            label={t("localization.enabledLocales")}
            options={localeOptions}
          />
          <TextField
            name="localization.defaultCurrency"
            label={t("localization.defaultCurrency")}
            dir="ltr"
          />
          <TextField name="localization.timezone" label={t("localization.timezone")} dir="ltr" />
        </Grid>
        <RadioField
          name="localization.numberingSystem"
          label={t("localization.numberingSystem")}
          options={[
            { value: "latn", label: t("localization.latn") },
            { value: "arab", label: t("localization.arab") },
          ]}
        />
      </Section>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("localization.label"), icon: Language });

export default LocalizationSettingsPage;
