import { defineRouteConfig } from "@medusajs/admin-sdk";
import { ChartBar } from "@medusajs/icons";
import { marketingSchema } from "@nocido/types";
import { z } from "zod";
import { Grid, LocalizedField, Section, SwitchField, TextField } from "../../../components/fields";
import { SettingsForm } from "../../../components/settings-form";
import { t } from "../../../lib/i18n";

const schema = z.object({ marketing: marketingSchema });

const MarketingSettingsPage = () => (
  <SettingsForm
    title={t("marketing.title")}
    description={t("marketing.description")}
    schema={schema}
    pick={(settings) => ({ marketing: settings.marketing })}
  >
    {() => (
      <>
        <Section title={t("marketing.title")}>
          <Grid>
            <TextField name="marketing.gtmId" label={t("marketing.gtmId")} dir="ltr" />
            <TextField name="marketing.metaPixelId" label={t("marketing.metaPixelId")} dir="ltr" />
            <TextField
              name="marketing.tiktokPixelId"
              label={t("marketing.tiktokPixelId")}
              dir="ltr"
            />
            <TextField name="marketing.ga4Id" label={t("marketing.ga4Id")} dir="ltr" />
          </Grid>
        </Section>
        <Section title={t("marketing.announcementBar")}>
          <SwitchField
            name="marketing.announcementBar.enabled"
            label={t("marketing.announcementEnabled")}
          />
          <LocalizedField
            name="marketing.announcementBar.text"
            label={t("marketing.announcementText")}
          />
          <TextField
            name="marketing.announcementBar.href"
            label={t("marketing.announcementHref")}
            dir="ltr"
            nullable
          />
        </Section>
      </>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("marketing.label"), icon: ChartBar });

export default MarketingSettingsPage;
