import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Receipt } from "@medusajs/icons";
import { Button, Text, toast } from "@medusajs/ui";
import { billingSchema } from "@nocido/types";
import { useEffect, useState } from "react";
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
import { fetchAdminFile } from "../../../lib/api";
import { errorMessage, t } from "../../../lib/i18n";

const schema = z.object({ billing: billingSchema });

/** Invoice and delivery note of the latest COD order, rendered with the saved settings. */
function DocumentPreview() {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState<"invoice" | "delivery-note" | null>(null);

  useEffect(
    () => () => {
      if (url) URL.revokeObjectURL(url);
    },
    [url],
  );

  const show = async (type: "invoice" | "delivery-note") => {
    setLoading(type);
    try {
      const result = await fetchAdminFile(`/admin/documents/preview?type=${type}`);
      setUrl(URL.createObjectURL(result.blob));
    } catch (error) {
      toast.error(t("documents.failed"), {
        description: error instanceof Error ? errorMessage(error.message) : undefined,
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <Text size="small" className="text-ui-fg-subtle">
        {t("documents.previewHint")}
      </Text>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="small"
          variant="secondary"
          isLoading={loading === "invoice"}
          disabled={loading !== null}
          onClick={() => void show("invoice")}
        >
          {t("documents.invoice")}
        </Button>
        <Button
          type="button"
          size="small"
          variant="secondary"
          isLoading={loading === "delivery-note"}
          disabled={loading !== null}
          onClick={() => void show("delivery-note")}
        >
          {t("documents.deliveryNote")}
        </Button>
      </div>
      {url ? (
        <iframe
          title={t("documents.preview")}
          src={url}
          className="border-ui-border-base h-[760px] w-full rounded-md border"
        />
      ) : null}
    </div>
  );
}

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
        <Section title={t("documents.preview")}>
          <DocumentPreview />
        </Section>
      </>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("billing.label"), icon: Receipt });

export default BillingSettingsPage;
