import { defineRouteConfig } from "@medusajs/admin-sdk";
import { MagnifyingGlass } from "@medusajs/icons";
import { Badge, Button, IconButton, Label, Select, Switch, Text } from "@medusajs/ui";
import { KIT_ROUTES } from "@nocido/api-client";
import { type CatalogFacet, catalogSettingsSchema } from "@nocido/types";
import { Trash } from "@medusajs/icons";
import { useEffect, useId, useState } from "react";
import { Controller, type UseFormReturn, useFieldArray, useWatch } from "react-hook-form";
import { z } from "zod";
import { LocalizedField, Section, TextField } from "../../../components/fields";
import { type FormValues, SettingsForm } from "../../../components/settings-form";
import { SortableList } from "../../../components/sortable-list";
import { adminFetch } from "../../../lib/api";
import { t, translate } from "../../../lib/i18n";

const schema = z.object({ catalog: catalogSettingsSchema });

/** Distinct product option titles (weight, size...), offered as new facets. */
function useOptionTitles(): string[] {
  const [titles, setTitles] = useState<string[]>([]);
  useEffect(() => {
    adminFetch<{ options: string[] }>(KIT_ROUTES.adminCatalogOptions)
      .then((body) => setTitles(body.options))
      .catch(() => undefined);
  }, []);
  return titles;
}

/** A free URL id for a new option facet: option, option-2... */
function freeId(facets: readonly CatalogFacet[]): string {
  const used = new Set(facets.map((facet) => facet.id));
  for (let index = 1; ; index++) {
    const id = index === 1 ? "option" : `option-${index}`;
    if (!used.has(id)) return id;
  }
}

function FacetRow({
  form,
  index,
  facet,
  onRemove,
}: {
  form: UseFormReturn<FormValues>;
  index: number;
  facet: CatalogFacet;
  onRemove: () => void;
}) {
  const switchId = useId();
  const [open, setOpen] = useState(false);
  const name = `catalog.facets.${index}`;
  const title =
    facet.kind === "option"
      ? t("catalog.kind.optionNamed", { option: facet.option ?? "" })
      : translate(`catalog.kind.${facet.kind}`);
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          <Label htmlFor={`${switchId}-enabled`} size="small" weight="plus">
            {title}
          </Label>
          <Text size="xsmall" className="text-ui-fg-subtle" dir="ltr">
            {facet.kind === "price" ? "?min=…&max=…" : `?${facet.id}=…`}
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" size="small" variant="transparent" onClick={() => setOpen(!open)}>
            {open ? t("catalog.hideDetails") : t("catalog.details")}
          </Button>
          {facet.kind === "option" ? (
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              aria-label={t("catalog.remove")}
              onClick={onRemove}
            >
              <Trash />
            </IconButton>
          ) : null}
          <Controller
            control={form.control}
            name={`${name}.enabled`}
            render={({ field }) => (
              <Switch
                id={`${switchId}-enabled`}
                aria-label={t("catalog.enabled")}
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked)}
              />
            )}
          />
        </div>
      </div>
      {open ? (
        <div className="flex flex-col gap-3">
          {facet.kind === "option" ? (
            <TextField
              name={`${name}.id`}
              label={t("catalog.param")}
              dir="ltr"
              hint={t("catalog.paramHint")}
            />
          ) : null}
          <LocalizedField name={`${name}.label`} label={t("catalog.label")} />
          {facet.kind !== "option" ? (
            <Text size="xsmall" className="text-ui-fg-subtle">
              {t("catalog.labelHint")}
            </Text>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FacetsEditor({ form }: { form: UseFormReturn<FormValues> }) {
  // Facets have their own `id` (the URL parameter): the field array keys elsewhere.
  const { fields, move, append, remove } = useFieldArray({
    control: form.control,
    name: "catalog.facets",
    keyName: "fieldKey",
  });
  const facets = (useWatch({ control: form.control, name: "catalog.facets" }) ??
    []) as CatalogFacet[];
  const titles = useOptionTitles();
  const unused = titles.filter(
    (title) => !facets.some((facet) => facet.kind === "option" && facet.option === title),
  );
  const [picked, setPicked] = useState<string | undefined>(undefined);

  return (
    <div className="flex flex-col gap-4">
      <SortableList
        items={fields}
        itemKey={(field) => (field as unknown as { fieldKey: string }).fieldKey}
        onMove={move}
      >
        {(field, index) => (
          <FacetRow
            form={form}
            index={index}
            facet={facets[index] ?? (field as unknown as CatalogFacet)}
            onRemove={() => remove(index)}
          />
        )}
      </SortableList>
      {unused.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-60 flex-col gap-y-2">
            <Label size="small" weight="plus">
              {t("catalog.addOption")}
            </Label>
            <Select value={picked} onValueChange={setPicked}>
              <Select.Trigger aria-label={t("catalog.addOption")}>
                <Select.Value placeholder={t("catalog.pickOption")} />
              </Select.Trigger>
              <Select.Content>
                {unused.map((title) => (
                  <Select.Item key={title} value={title}>
                    {title}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
          <Button
            type="button"
            size="small"
            variant="secondary"
            disabled={!picked}
            onClick={() => {
              if (!picked) return;
              append({
                id: freeId(facets),
                kind: "option",
                option: picked,
                enabled: true,
                label: {},
              });
              setPicked(undefined);
            }}
          >
            {t("catalog.add")}
          </Button>
        </div>
      ) : null}
      <div>
        <Badge size="2xsmall" color="blue">
          {t("catalog.liveHint")}
        </Badge>
      </div>
    </div>
  );
}

const CatalogSettingsPage = () => (
  <SettingsForm
    title={t("catalog.title")}
    description={t("catalog.description")}
    schema={schema}
    pick={(settings) => ({ catalog: settings.catalog })}
  >
    {(form) => (
      <Section title={t("catalog.facets")}>
        <Text size="xsmall" className="text-ui-fg-subtle">
          {t("catalog.facetsHint")}
        </Text>
        <FacetsEditor form={form} />
      </Section>
    )}
  </SettingsForm>
);

export const config = defineRouteConfig({ label: t("catalog.navLabel"), icon: MagnifyingGlass });

export default CatalogSettingsPage;
