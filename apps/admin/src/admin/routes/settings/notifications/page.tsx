import { defineRouteConfig } from "@medusajs/admin-sdk";
import { BellAlert } from "@medusajs/icons";
import { Button, Container, Heading, Input, Label, Select, Text, toast } from "@medusajs/ui";
import { LOCALES } from "@nocido/types";
import { useEffect, useId, useState } from "react";
import { z } from "zod";
import { ApiRequestError, fetchNotificationPreview, sendNotificationTest } from "../../../lib/api";
import { errorMessage, localeLabel, type MessageKey, t } from "../../../lib/i18n";

const KINDS = ["placed", "confirmed", "cancelled", "shipped", "delivered", "merchant"] as const;

/** Preview of each order email in each language, and a test send through SMTP. */
const NotificationsPage = () => {
  const id = useId();
  const [kind, setKind] = useState<(typeof KINDS)[number]>("placed");
  const [locale, setLocale] = useState<string>(LOCALES[0]);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [to, setTo] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    fetchNotificationPreview({ kind, locale })
      .then((result) => {
        if (!active) return;
        setPreview(result);
        setError(null);
      })
      .catch((failure: unknown) => {
        if (!active) return;
        setPreview(null);
        setError(errorMessage(failure instanceof ApiRequestError ? failure.message : undefined));
      });
    return () => {
      active = false;
    };
  }, [kind, locale]);

  const send = async () => {
    setSending(true);
    try {
      await sendNotificationTest({ kind, locale, to });
      toast.success(t("notifications.sent"));
    } catch (failure) {
      toast.error(t("notifications.failed"), {
        description: failure instanceof Error ? failure.message : undefined,
      });
    } finally {
      setSending(false);
    }
  };

  return (
    <Container className="divide-y p-0">
      <div className="flex flex-col gap-y-1 px-6 py-4">
        <Heading>{t("notifications.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("notifications.description")}
        </Text>
      </div>

      <div className="flex flex-wrap items-end gap-4 px-6 py-4">
        <div className="flex flex-col gap-y-2">
          <Label size="small" weight="plus">
            {t("notifications.kind")}
          </Label>
          <Select value={kind} onValueChange={(value) => setKind(value as typeof kind)}>
            <Select.Trigger className="w-72">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {KINDS.map((candidate) => (
                <Select.Item key={candidate} value={candidate}>
                  {t(`notifications.kind.${candidate}` as MessageKey)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-y-2">
          <Label size="small" weight="plus">
            {t("notifications.locale")}
          </Label>
          <Select value={locale} onValueChange={setLocale}>
            <Select.Trigger className="w-40">
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {LOCALES.map((candidate) => (
                <Select.Item key={candidate} value={candidate}>
                  {localeLabel(candidate)}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <div className="flex flex-col gap-y-2">
          <Label htmlFor={id} size="small" weight="plus">
            {t("notifications.testTo")}
          </Label>
          <div className="flex gap-2">
            <Input
              id={id}
              type="email"
              dir="ltr"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="w-64"
            />
            <Button
              type="button"
              variant="secondary"
              size="small"
              isLoading={sending}
              disabled={!preview || !z.email().safeParse(to).success}
              onClick={() => void send()}
            >
              {t("notifications.send")}
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-y-3 px-6 py-4">
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t("notifications.smtpHint")}
        </Text>
        {error ? (
          <Text size="small" className="text-ui-fg-error">
            {error}
          </Text>
        ) : null}
        {preview ? (
          <>
            <Text size="small">
              <span className="text-ui-fg-subtle">{t("notifications.subject")} : </span>
              <span dir="auto">{preview.subject}</span>
            </Text>
            <iframe
              title={t("notifications.preview")}
              srcDoc={preview.html}
              sandbox=""
              className="border-ui-border-base h-[720px] w-full rounded-md border"
            />
          </>
        ) : null}
      </div>
    </Container>
  );
};

export const config = defineRouteConfig({ label: t("notifications.label"), icon: BellAlert });

export default NotificationsPage;
