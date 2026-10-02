import { Trash } from "@medusajs/icons";
import { Button, Container, Heading, IconButton, Input, Label, Text, toast } from "@medusajs/ui";
import { KIT_ROUTES } from "@nocido/api-client";
import { type FormEvent, useCallback, useEffect, useId, useState } from "react";
import { adminFetch, ApiRequestError } from "../lib/api";
import { errorMessage, t } from "../lib/i18n";

interface RedirectRow {
  from: string;
  to: string;
}

/**
 * Permanent (301) redirects of the storefront. Renamed product, category
 * and page handles are added automatically; old URLs can be added by hand.
 */
export function RedirectsManager() {
  const id = useId();
  const [rows, setRows] = useState<RedirectRow[] | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => {
    adminFetch<{ redirects: RedirectRow[] }>(KIT_ROUTES.adminRedirects)
      .then((body) => setRows(body.redirects))
      .catch(() => setRows([]));
  }, []);
  useEffect(load, [load]);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const body = await adminFetch<{ redirects: RedirectRow[] }>(KIT_ROUTES.adminRedirects, {
        method: "POST",
        body: JSON.stringify({ from, to }),
      });
      setRows(body.redirects);
      setFrom("");
      setTo("");
      toast.success(t("redirects.added"));
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError
          ? errorMessage(error.issues[0]?.code ?? error.message)
          : t("common.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: RedirectRow) => {
    try {
      const body = await adminFetch<{ redirects: RedirectRow[] }>(
        `${KIT_ROUTES.adminRedirects}?from=${encodeURIComponent(row.from)}`,
        { method: "DELETE" },
      );
      setRows(body.redirects);
    } catch {
      toast.error(t("common.saveFailed"));
    }
  };

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex flex-col gap-1">
        <Heading level="h2">{t("redirects.title")}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {t("redirects.description")}
        </Text>
      </div>
      <form onSubmit={(event) => void add(event)} className="flex flex-wrap items-end gap-3">
        <div className="flex min-w-48 flex-1 flex-col gap-y-2">
          <Label htmlFor={`${id}-from`} size="small" weight="plus">
            {t("redirects.from")}
          </Label>
          <Input
            id={`${id}-from`}
            dir="ltr"
            placeholder={t("redirects.fromPlaceholder")}
            value={from}
            onChange={(event) => setFrom(event.target.value)}
          />
        </div>
        <div className="flex min-w-48 flex-1 flex-col gap-y-2">
          <Label htmlFor={`${id}-to`} size="small" weight="plus">
            {t("redirects.to")}
          </Label>
          <Input
            id={`${id}-to`}
            dir="ltr"
            placeholder={t("redirects.toPlaceholder")}
            value={to}
            onChange={(event) => setTo(event.target.value)}
          />
        </div>
        <Button type="submit" size="small" variant="secondary" isLoading={saving}>
          {t("redirects.add")}
        </Button>
      </form>
      {rows === null ? null : rows.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle">
          {t("redirects.empty")}
        </Text>
      ) : (
        <ul className="divide-ui-border-base flex flex-col divide-y">
          {rows.map((row) => (
            <li key={row.from} className="flex items-center justify-between gap-3 py-2">
              <Text size="small" dir="ltr" className="truncate">
                {`${row.from} → ${row.to}`}
              </Text>
              <IconButton
                type="button"
                size="small"
                variant="transparent"
                aria-label={t("redirects.remove", { path: row.from })}
                onClick={() => void remove(row)}
              >
                <Trash />
              </IconButton>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
