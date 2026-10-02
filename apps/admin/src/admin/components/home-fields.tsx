import { clx, Input, Label, Select, Text } from "@medusajs/ui";
import { HOME_LINK_TYPES, type HomeLink, type HomeLinkType } from "@nocido/types";
import { type KeyboardEvent, useEffect, useId, useState } from "react";
import { Controller, useFormContext } from "react-hook-form";
import { type LinkTarget, searchLinkTargets } from "../lib/home";
import { t } from "../lib/i18n";
import { FieldError } from "./fields";

const NONE = "none";
const DEBOUNCE_MS = 250;

/** Label of a saved handle, fetched once (the search results may not contain it). */
function useTargetLabel(type: "category" | "product", handle: string): string | null {
  const key = `${type}:${handle}`;
  const [loaded, setLoaded] = useState<{ key: string; label: string | null } | null>(null);
  useEffect(() => {
    if (!handle) return;
    const controller = new AbortController();
    searchLinkTargets(type, { handle, signal: controller.signal })
      .then((targets) => setLoaded({ key: `${type}:${handle}`, label: targets[0]?.label ?? null }))
      .catch(() => undefined);
    return () => controller.abort();
  }, [type, handle]);
  return loaded?.key === key ? loaded.label : null;
}

/**
 * Search-as-you-type picker of a category or product (by name in any
 * language, or handle). Combobox pattern: arrow keys move through the
 * results, Enter picks, Escape closes.
 */
function TargetCombobox({
  id,
  type,
  handle,
  onPick,
  onBlur,
}: {
  id: string;
  type: "category" | "product";
  handle: string;
  onPick: (target: LinkTarget) => void;
  onBlur: () => void;
}) {
  const listId = useId();
  const savedLabel = useTargetLabel(type, handle);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  // Results with the search they answer: loading while it differs from the current one.
  const [found, setFound] = useState<{ key: string; targets: LinkTarget[] }>({
    key: "",
    targets: [],
  });
  const [active, setActive] = useState(0);
  const searchKey = `${type}:${query}`;
  const results = found.targets;
  const loading = open && found.key !== searchKey;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      searchLinkTargets(type, { query, signal: controller.signal })
        .then((targets) => {
          setFound({ key: `${type}:${query}`, targets });
          setActive(0);
        })
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, type]);

  const pick = (target: LinkTarget) => {
    onPick(target);
    setQuery("");
    setOpen(false);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      if (results.length > 0) {
        const step = event.key === "ArrowDown" ? 1 : -1;
        setActive((current) => (current + step + results.length) % results.length);
      }
    } else if (event.key === "Enter" && open) {
      event.preventDefault();
      const target = results[active];
      if (target) pick(target);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  const current = handle ? `${savedLabel ?? handle} · ${handle}` : "";

  return (
    <div className="relative">
      <Input
        id={id}
        type="search"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${listId}-${active}` : undefined}
        aria-label={t(`homeItems.link.${type}`)}
        placeholder={current || t("homeItems.link.search")}
        value={open ? query : current}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => {
          // Let a click on a result land before closing.
          window.setTimeout(() => setOpen(false), 150);
          onBlur();
        }}
      />
      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="bg-ui-bg-base border-ui-border-base shadow-elevation-flyout absolute inset-x-0 top-full z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border p-1"
        >
          {loading || results.length === 0 ? (
            <li className="text-ui-fg-subtle txt-compact-small px-2 py-1.5">
              {loading ? t("homeItems.link.searching") : t("homeItems.link.noResult")}
            </li>
          ) : (
            results.map((target, index) => (
              <li
                key={target.handle}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pick(target);
                }}
                onMouseEnter={() => setActive(index)}
                className={clx(
                  "txt-compact-small flex cursor-pointer items-center justify-between gap-3 rounded-md px-2 py-1.5",
                  index === active && "bg-ui-bg-base-hover",
                )}
              >
                <span className="truncate">{target.label}</span>
                <span className="text-ui-fg-muted shrink-0" dir="ltr">
                  {target.handle}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}

/** Link of a slide or banner: nothing, a category, a product or a URL. */
export function LinkField({ name, label }: { name: string; label: string }) {
  const { control } = useFormContext();
  const id = useId();
  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus" htmlFor={id}>
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const link = field.value as HomeLink | null;
          const type: HomeLinkType | typeof NONE = link?.type ?? NONE;
          const setType = (next: string) => {
            if (next === "category" || next === "product") {
              field.onChange({ type: next, handle: "" });
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
                <TargetCombobox
                  id={id}
                  type={link.type}
                  handle={link.handle}
                  onPick={(target) => field.onChange({ type: link.type, handle: target.handle })}
                  onBlur={field.onBlur}
                />
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
