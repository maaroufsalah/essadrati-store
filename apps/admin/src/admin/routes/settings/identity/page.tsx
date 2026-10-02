import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BuildingStorefront } from "@medusajs/icons";
import { identitySchema, seoSchema } from "@nocido/types";
import { z } from "zod";
import { Grid, LocalizedField, MediaField, Section } from "../../../components/fields";
import { SettingsForm } from "../../../components/settings-form";
import { t } from "../../../lib/i18n";

const schema = z.object({ identity: identitySchema, seo: seoSchema });

const IdentitySettingsPage = () => (
  <SettingsForm
    title={t("store.title")}
    description={t("store.description")}
    schema={schema}
    pick={(settings) => ({ identity: settings.identity, seo: settings.seo })}
  >
    {() => (
      <>
        <Section title={t("store.title")}>
          <LocalizedField name="identity.storeName" label={t("store.storeName")} />
          <LocalizedField name="identity.tagline" label={t("store.tagline")} />
        </Section>
        <Section title={t("store.logoLight")}>
          <Grid>
            <MediaField name="identity.logoLight" label={t("store.logoLight")} />
            <MediaField name="identity.logoDark" label={t("store.logoDark")} />
            <MediaField
              name="identity.favicon"
              label={t("store.favicon")}
              accept="image/png,image/x-icon,image/svg+xml"
            />
            <MediaField
              name="identity.ogImage"
              label={t("store.ogImage")}
              accept="image/png,image/jpeg,image/webp"
            />
          </Grid>
        </Section>
        <Section title={t("store.seoTitle")}>
          <LocalizedField name="seo.metaTitle" label={t("store.seoTitle")} />
          <LocalizedField name="seo.metaDescription" label={t("store.seoDescription")} multiline />
        </Section>
      </>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("store.label"), icon: BuildingStorefront });

export default IdentitySettingsPage;
