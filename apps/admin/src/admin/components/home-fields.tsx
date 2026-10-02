import { Input, Label, Select, Text } from "@medusajs/ui";
import { HOME_LINK_TYPES, type HomeLink, type HomeLinkType } from "@nocido/types";
import { useId } from "react";
import { Controller, useFormContext } from "react-hook-form";
import type { LinkTargets } from "../lib/home";
import { t } from "../lib/i18n";
import { FieldError } from "./fields";

const NONE = "none";

/** Link of a slide or banner: nothing, a category, a product or a URL. */
export function LinkField({
  name,
  label,
  targets,
}: {
  name: string;
  label: string;
  targets: LinkTargets | null;
}) {
  const { control } = useFormContext();
  const id = useId();
  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const link = field.value as HomeLink | null;
          const type: HomeLinkType | typeof NONE = link?.type ?? NONE;
          const options =
            type === "category"
              ? (targets?.categories ?? [])
              : type === "product"
                ? (targets?.products ?? [])
                : [];
          const setType = (next: string) => {
            if (next === "category" || next === "product") {
              const first = (next === "category" ? targets?.categories : targets?.products)?.[0];
              field.onChange({ type: next, handle: first?.handle ?? "" });
            } else if (next === "url") field.onChange({ type: "url", href: "" });
            else field.onChange(null);
          };
          return (
            <div className="grid grid-cols-1 gap-2 md:grid-cols-[180px_minmax(0,1fr)]">
              <Select value={type} onValueChange={setType}>
                <Select.Trigger aria-label={label}>
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  <Select.Item value={NONE}>{t("homeItems.link.none")}</Select.Item>
                  {HOME_LINK_TYPES.map((value) => (
                    <Select.Item key={value} value={value}>
                      {t(`homeItems.link.${value}`)}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              {link && link.type !== "url" ? (
                <Select
                  value={link.handle || undefined}
                  onValueChange={(handle) => field.onChange({ type: link.type, handle })}
                >
                  <Select.Trigger id={id} aria-label={t(`homeItems.link.${link.type}`)}>
                    <Select.Value placeholder={t("homeItems.link.pick")} />
                  </Select.Trigger>
                  <Select.Content>
                    {options.map((option) => (
                      <Select.Item key={option.handle} value={option.handle}>
                        {option.label}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              ) : link?.type === "url" ? (
                <Input
                  id={id}
                  dir="ltr"
                  aria-label={t("homeItems.link.url")}
                  placeholder={t("homeItems.link.urlPlaceholder")}
                  value={link.href}
                  onChange={(event) => field.onChange({ type: "url", href: event.target.value })}
                  onBlur={field.onBlur}
                />
              ) : null}
            </div>
          );
        }}
      />
      <FieldError name={name} />
      <FieldError name={`${name}.handle`} />
      <FieldError name={`${name}.href`} />
    </div>
  );
}

/** Integer slider with its value, e.g. the overlay opacity in percent. */
export function RangeField({
  name,
  label,
  min,
  max,
  step = 1,
  unit = "",
}: {
  name: string;
  label: string;
  min: number;
  max: number;
  step?: number;
  unit?: string;
}) {
  const { control } = useFormContext();
  const id = useId();
  return (
    <div className="flex flex-col gap-y-2">
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const value = typeof field.value === "number" ? field.value : min;
          return (
            <>
              <div className="flex items-center justify-between">
                <Label htmlFor={id} size="small" weight="plus">
                  {label}
                </Label>
                <Text size="small" className="text-ui-fg-subtle tabular-nums">
                  {`${value}${unit}`}
                </Text>
              </div>
              <input
                id={id}
                type="range"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(event) => field.onChange(Number(event.target.value))}
                onBlur={field.onBlur}
                className="accent-ui-fg-interactive w-full"
              />
            </>
          );
        }}
      />
      <FieldError name={name} />
    </div>
  );
}
