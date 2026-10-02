import { defineWidgetConfig } from "@medusajs/admin-sdk";
import type { AdminOrder, DetailWidgetProps } from "@medusajs/framework/types";
import { Button, Container, Heading, StatusBadge, Text, toast, usePrompt } from "@medusajs/ui";
import { toWhatsAppNumber } from "@nocido/types";
import { useState } from "react";
import { adminFetch } from "../lib/api";
import { errorMessage, t } from "../lib/i18n";

type CodStatus = "pending" | "confirmed" | "cancelled";

const STATUS_COLOR = { pending: "orange", confirmed: "green", cancelled: "red" } as const;

function isCodStatus(value: unknown): value is CodStatus {
  return value === "pending" || value === "confirmed" || value === "cancelled";
}

function readMetadata(order: AdminOrder) {
  const metadata = order.metadata ?? {};
  const status = metadata.cod_status;
  return {
    isCod: metadata.cod === true,
    status: isCodStatus(status) ? status : null,
    name: typeof metadata.customer_name === "string" ? metadata.customer_name : null,
    phone: typeof metadata.customer_phone === "string" ? metadata.customer_phone : null,
    note: typeof metadata.customer_note === "string" ? metadata.customer_note : null,
  };
}

/** COD confirmation card on the order page: call, WhatsApp, confirm or cancel. */
const CodOrderWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
  const cod = readMetadata(order);
  const [status, setStatus] = useState<CodStatus | null>(cod.status);
  const [busy, setBusy] = useState<"confirm" | "cancel" | null>(null);
  const prompt = usePrompt();

  if (!cod.isCod) return null;

  const run = async (action: "confirm" | "cancel") => {
    if (action === "cancel") {
      const accepted = await prompt({
        title: t("cod.cancel"),
        description: t("cod.cancelConfirm"),
        confirmText: t("cod.cancel"),
        cancelText: t("common.reset"),
      });
      if (!accepted) return;
    }
    setBusy(action);
    try {
      const result = await adminFetch<{ cod_status: CodStatus }>(
        `/admin/cod/orders/${order.id}/${action}`,
        {
          method: "POST",
          body: "{}",
        },
      );
      setStatus(result.cod_status);
      toast.success(t(action === "confirm" ? "cod.confirmed" : "cod.cancelled"));
      // The order page shows Medusa's own status: reload it after a cancellation.
      if (action === "cancel") window.setTimeout(() => window.location.reload(), 600);
    } catch (error) {
      toast.error(t("cod.actionFailed"), {
        description: error instanceof Error ? errorMessage(error.message) : undefined,
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Container className="flex flex-col gap-3 px-6 py-4">
      <div className="flex items-center justify-between gap-2">
        <Heading level="h2">{t("cod.widgetTitle")}</Heading>
        {status ? (
          <StatusBadge color={STATUS_COLOR[status]}>{t(`cod.status.${status}`)}</StatusBadge>
        ) : null}
      </div>
      <div className="flex flex-col gap-1">
        {cod.name ? <Text size="small">{`${t("cod.customer")} : ${cod.name}`}</Text> : null}
        {cod.phone ? (
          <Text size="small" className="flex flex-wrap items-center gap-2">
            <span dir="ltr">{cod.phone}</span>
            <a className="text-ui-fg-interactive" href={`tel:${cod.phone}`}>
              {t("cod.call")}
            </a>
            <a
              className="text-ui-fg-interactive"
              href={`https://wa.me/${toWhatsAppNumber(cod.phone)}`}
              target="_blank"
              rel="noreferrer"
            >
              {t("cod.whatsapp")}
            </a>
          </Text>
        ) : null}
        {cod.note ? (
          <Text size="small" className="text-ui-fg-subtle">{`${t("cod.note")} : ${cod.note}`}</Text>
        ) : null}
      </div>
      {status === "pending" || status === "confirmed" ? (
        <div className="flex flex-wrap gap-2">
          {status === "pending" ? (
            <Button
              size="small"
              isLoading={busy === "confirm"}
              disabled={busy !== null}
              onClick={() => void run("confirm")}
            >
              {t("cod.confirm")}
            </Button>
          ) : null}
          <Button
            size="small"
            variant="danger"
            isLoading={busy === "cancel"}
            disabled={busy !== null}
            onClick={() => void run("cancel")}
          >
            {t("cod.cancel")}
          </Button>
        </div>
      ) : null}
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("cod.captureHint")}
      </Text>
    </Container>
  );
};

export const config = defineWidgetConfig({ zone: "order.details.side.before" });

export default CodOrderWidget;
