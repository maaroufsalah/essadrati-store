import { defineRouteConfig } from "@medusajs/admin-sdk";
import { Phone } from "@medusajs/icons";
import { Button, Input, Label, Text, toast } from "@medusajs/ui";
import {
  contactSchema,
  SOCIAL_NETWORKS,
  smtpSchema,
  type StoreSettingsUpdate,
} from "@nocido/types";
import { useId, useState } from "react";
import { z } from "zod";
import {
  Grid,
  LocalizedField,
  NumberField,
  Section,
  SwitchField,
  TextField,
} from "../../../components/fields";
import { type FormValues, SettingsForm } from "../../../components/settings-form";
import { sendTestEmail } from "../../../lib/api";
import { t } from "../../../lib/i18n";

/** The SMTP password is write-only: an empty field keeps the stored one. */
const smtpFormSchema = smtpSchema.omit({ passwordSet: true }).extend({
  password: z.string().max(512),
  clearPassword: z.boolean(),
});

const schema = z.object({ contact: contactSchema, smtp: smtpFormSchema });
type ContactForm = z.output<typeof schema>;

function toUpdate(values: FormValues): StoreSettingsUpdate {
  const { contact, smtp } = values as ContactForm;
  const { password, clearPassword, ...fields } = smtp;
  return {
    contact,
    smtp: {
      ...fields,
      ...(clearPassword ? { password: null } : password ? { password } : {}),
    },
  };
}

function TestEmail({ disabled }: { disabled: boolean }) {
  const id = useId();
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    setSending(true);
    try {
      await sendTestEmail(to);
      toast.success(t("contact.testEmailSent"));
    } catch (error) {
      toast.error(t("contact.testEmailFailed"), {
        description: error instanceof Error ? error.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={id} size="small" weight="plus">
        {t("contact.testEmailTo")}
      </Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id={id}
          type="email"
          dir="ltr"
          value={to}
          onChange={(event) => setTo(event.target.value)}
          className="max-w-xs"
        />
        <Button
          type="button"
          variant="secondary"
          size="small"
          isLoading={sending}
          disabled={disabled || !z.email().safeParse(to).success}
          onClick={() => void send()}
        >
          {t("contact.testEmail")}
        </Button>
      </div>
      {disabled ? (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t("contact.testEmailSaveFirst")}
        </Text>
      ) : null}
    </div>
  );
}

const ContactSettingsPage = () => (
  <SettingsForm
    title={t("contact.title")}
    description={t("contact.description")}
    schema={schema}
    pick={(settings) => {
      const { passwordSet: _passwordSet, ...smtp } = settings.smtp;
      return { contact: settings.contact, smtp: { ...smtp, password: "", clearPassword: false } };
    }}
    toUpdate={toUpdate}
  >
    {(form, settings) => (
      <>
        <Section title={t("contact.title")}>
          <Grid>
            <TextField
              name="contact.phone"
              label={t("contact.phone")}
              type="tel"
              dir="ltr"
              nullable
            />
            <TextField
              name="contact.whatsapp"
              label={t("contact.whatsapp")}
              type="tel"
              dir="ltr"
              nullable
            />
            <TextField
              name="contact.email"
              label={t("contact.email")}
              type="email"
              dir="ltr"
              nullable
            />
            <TextField name="contact.city" label={t("contact.city")} />
            <TextField name="contact.country" label={t("contact.country")} dir="ltr" />
            <TextField
              name="contact.mapUrl"
              label={t("contact.mapUrl")}
              type="url"
              dir="ltr"
              nullable
            />
          </Grid>
          <LocalizedField name="contact.address" label={t("contact.address")} multiline />
          <LocalizedField name="contact.openingHours" label={t("contact.openingHours")} multiline />
        </Section>
        <Section title={t("contact.socials")}>
          <Grid>
            {SOCIAL_NETWORKS.map((network) => (
              <TextField
                key={network}
                name={`contact.socials.${network}`}
                label={network.charAt(0).toUpperCase() + network.slice(1)}
                type="url"
                dir="ltr"
                nullable
              />
            ))}
          </Grid>
        </Section>
        <Section title={t("contact.smtp")}>
          <Grid>
            <TextField name="smtp.host" label={t("contact.smtpHost")} dir="ltr" />
            <NumberField name="smtp.port" label={t("contact.smtpPort")} min={1} max={65535} />
            <TextField name="smtp.user" label={t("contact.smtpUser")} dir="ltr" />
            <TextField
              name="smtp.password"
              label={t("contact.smtpPassword")}
              type="password"
              dir="ltr"
              hint={settings.smtp.passwordSet ? t("contact.smtpPasswordSet") : undefined}
            />
            <TextField name="smtp.fromName" label={t("contact.smtpFromName")} />
            <TextField
              name="smtp.fromEmail"
              label={t("contact.smtpFromEmail")}
              type="email"
              dir="ltr"
            />
          </Grid>
          <SwitchField name="smtp.secure" label={t("contact.smtpSecure")} />
          {settings.smtp.passwordSet ? (
            <SwitchField name="smtp.clearPassword" label={t("contact.smtpPasswordClear")} />
          ) : null}
          <TestEmail disabled={Object.keys(form.formState.dirtyFields).length > 0} />
        </Section>
      </>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("contact.label"), icon: Phone });

export default ContactSettingsPage;
