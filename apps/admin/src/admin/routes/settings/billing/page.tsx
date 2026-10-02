import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Receipt } from "@medusajs/icons";
import { billingSchema } from "@nocido/types";
import { z } from "zod";
import {
  Grid,
  LocalizedField,
  NumberField,
  Section,
  SwitchField,
  TextField,
} from "../../../components/fields";
import { SettingsForm } from "../../../components/settings-form";
import { t } from "../../../lib/i18n";

const schema = z.object({ billing: billingSchema });

const BillingSettingsPage = () => (
  <SettingsForm
    title={t("billing.title")}
    description={t("billing.description")}
    schema={schema}
    pick={(settings) => ({ billing: settings.billing })}
  >
    {() => (
      <>
        <Section title={t("billing.title")}>
          <Grid>
            <TextField name="billing.legalName" label={t("billing.legalName")} />
            <TextField name="billing.ice" label={t("billing.ice")} dir="ltr" />
            <TextField name="billing.rc" label={t("billing.rc")} dir="ltr" />
            <TextField name="billing.if" label={t("billing.if")} dir="ltr" />
            <TextField name="billing.patente" label={t("billing.patente")} dir="ltr" />
            <TextField name="billing.cnss" label={t("billing.cnss")} dir="ltr" />
          </Grid>
        </Section>
        <Section title={t("billing.tvaRate")}>
          <SwitchField name="billing.tva.subject" label={t("billing.tvaSubject")} />
          <Grid>
            <NumberField
              name="billing.tva.rate"
              label={t("billing.tvaRate")}
              min={0}
              max={100}
              step={0.5}
            />
            <TextField name="billing.invoicePrefix" label={t("billing.invoicePrefix")} dir="ltr" />
          </Grid>
          <LocalizedField
            name="billing.invoiceFooter"
            label={t("billing.invoiceFooter")}
            multiline
          />
        </Section>
        <Section title={t("billing.bankName")}>
          <Grid>
            <TextField name="billing.bankName" label={t("billing.bankName")} />
            <TextField name="billing.rib" label={t("billing.rib")} dir="ltr" />
          </Grid>
        </Section>
      </>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("billing.label"), icon: Receipt });

export default BillingSettingsPage;
