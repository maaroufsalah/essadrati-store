import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSquare, Photo, Plus, Trash } from "@medusajs/icons";
import {
  Badge,
  Button,
  clx,
  Container,
  FocusModal,
  Heading,
  IconButton,
  Skeleton,
  Switch,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui";
import { LOCALES, type Locale, type LocalizedString, type MediaRef } from "@nocido/types";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { type FieldValues, FormProvider, type Resolver, useForm, useWatch } from "react-hook-form";
import type { z } from "zod";
import { ApiRequestError } from "../lib/api";
import {
  deleteHomeItem,
  type HomeItemsApi,
  listHomeItems,
  moveItem,
  reorderHomeItems,
  saveHomeItem,
} from "../lib/home";
import { errorMessage, localeLabel, t } from "../lib/i18n";
import type { PreviewMode } from "./home-preview";
import { SortableList } from "./sortable-list";

/** What every home item (hero slide, category banner) has in common. */
export interface HomeItemBase {
  id: string;
  active: boolean;
  rank: number;
  title: LocalizedString;
  imageDesktop: MediaRef | null;
}

export interface HomeItemsManagerProps<T extends HomeItemBase> {
  api: HomeItemsApi;
  schema: z.ZodType<FieldValues, FieldValues>;
  /** Form values of a new item at `rank`. */
  empty: (rank: number) => FieldValues;
  /** Editable fields of an existing item (no id, no updatedAt). */
  toInput: (item: T) => FieldValues;
  /** Form fields, rendered inside the form context. */
  fields: ReactNode;
  /** Live preview of the watched values. */
  preview: (values: FieldValues, mode: PreviewMode, locale: Locale) => ReactNode;
  labels: {
    title: string;
    description: string;
    add: string;
    empty: string;
    newItem: string;
    deleteTitle: string;
    deleteConfirm: string;
  };
}

/** Drops keys whose value is undefined (empty locales), like the settings forms do. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function itemTitle(item: HomeItemBase): string {
  for (const locale of ["fr", ...LOCALES] as const) {
    const text = item.title[locale];
    if (text) return text;
  }
  return t("homeItems.untitled");
}

function Editor<T extends HomeItemBase>({
  config,
  item,
  rank,
  onClose,
  onSaved,
}: {
  config: HomeItemsManagerProps<T>;
  item: T | null;
  rank: number;
  onClose: () => void;
  onSaved: (saved: T) => void;
}) {
  const [mode, setMode] = useState<PreviewMode>("desktop");
  const [locale, setLocale] = useState<Locale>("fr");
  const form = useForm<FieldValues>({
    resolver: ((values, context, options) =>
      zodResolver(config.schema)(clean(values), context, options)) as Resolver<FieldValues>,
    defaultValues: item ? config.toInput(item) : config.empty(rank),
  });
  const values = useWatch({ control: form.control });

  const save = async (input: FieldValues) => {
    try {
      const saved = await saveHomeItem<T>(config.api, input, item?.id ?? null);
      toast.success(t("homeItems.saved"));
      onSaved(saved);
    } catch (error) {
      if (error instanceof ApiRequestError) {
        for (const issue of error.issues) {
          if (issue.path) form.setError(issue.path, { message: issue.code });
        }
        toast.error(errorMessage(error.issues[0]?.code ?? error.message));
        return;
      }
      toast.error(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <FocusModal open onOpenChange={(open) => !open && onClose()}>
      <FocusModal.Content>
        <FormProvider {...form}>
          <form
            noValidate
            className="flex h-full flex-col overflow-hidden"
            onSubmit={(event) => {
              void form.handleSubmit(save, () => toast.error(t("common.invalid")))(event);
            }}
          >
            <FocusModal.Header>
              <div className="flex w-full items-center justify-between gap-3">
                <FocusModal.Title asChild>
                  <Heading level="h2">{item ? itemTitle(item) : config.labels.newItem}</Heading>
                </FocusModal.Title>
                <Button type="submit" size="small" isLoading={form.formState.isSubmitting}>
                  {t("common.save")}
                </Button>
              </div>
            </FocusModal.Header>
            <FocusModal.Body className="flex flex-1 flex-col overflow-hidden lg:flex-row">
              <div className="flex flex-col gap-y-6 overflow-y-auto p-6 lg:w-[520px] lg:shrink-0">
                {config.fields}
              </div>
              <div className="bg-ui-bg-subtle border-ui-border-base flex flex-1 flex-col gap-4 overflow-y-auto border-t p-6 lg:border-s lg:border-t-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Text size="small" weight="plus">
                    {t("homeItems.preview")}
                  </Text>
                  <div className="flex flex-wrap gap-1">
                    {(["desktop", "mobile"] as const).map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="small"
                        variant={mode === value ? "primary" : "secondary"}
                        onClick={() => setMode(value)}
                      >
                        {t(value === "desktop" ? "homeItems.desktop" : "homeItems.mobile")}
                      </Button>
                    ))}
                    {LOCALES.map((value) => (
                      <Button
                        key={value}
                        type="button"
                        size="small"
                        variant={locale === value ? "primary" : "transparent"}
                        onClick={() => setLocale(value)}
                      >
                        {localeLabel(value)}
                      </Button>
                    ))}
                  </div>
                </div>
                {config.preview(clean(values), mode, locale)}
              </div>
            </FocusModal.Body>
          </form>
        </FormProvider>
      </FocusModal.Content>
    </FocusModal>
  );
}

/**
 * List of hero slides or category banners: drag and drop order (saved at
 * once), activation switch, editor with a live desktop/mobile preview.
 * Each change revalidates the storefront through the backend.
 */
export function HomeItemsManager<T extends HomeItemBase>(config: HomeItemsManagerProps<T>) {
  const prompt = usePrompt();
  const [items, setItems] = useState<T[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<T | "new" | null>(null);

  const reload = useCallback(() => {
    listHomeItems<T>(config.api)
      .then(setItems)
      .catch((error: unknown) => {
        toast.error(t("common.loadFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
        setItems([]);
      });
  }, [config.api]);

  useEffect(reload, [reload]);

  const move = async (from: number, to: number) => {
    if (!items) return;
    const next = moveItem(items, from, to);
    setItems(next);
    setBusy(true);
    try {
      setItems(
        await reorderHomeItems<T>(
          config.api,
          next.map((item) => item.id),
        ),
      );
    } catch {
      toast.error(t("homeItems.reorderFailed"));
      reload();
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (item: T, active: boolean) => {
    setItems(
      (current) =>
        current?.map((entry) => (entry.id === item.id ? { ...entry, active } : entry)) ?? null,
    );
    try {
      const saved = await saveHomeItem<T>(config.api, { ...config.toInput(item), active }, item.id);
      setItems(
        (current) => current?.map((entry) => (entry.id === saved.id ? saved : entry)) ?? null,
      );
    } catch {
      toast.error(t("common.saveFailed"));
      reload();
    }
  };

  const remove = async (item: T) => {
    if (
      !(await prompt({
        title: config.labels.deleteTitle,
        description: config.labels.deleteConfirm,
      }))
    )
      return;
    try {
      await deleteHomeItem(config.api, item.id);
      setItems((current) => current?.filter((entry) => entry.id !== item.id) ?? null);
      toast.success(t("homeItems.deleted"));
    } catch {
      toast.error(t("common.saveFailed"));
    }
  };

  const onSaved = (saved: T) => {
    setItems((current) => {
      if (!current) return [saved];
      return current.some((entry) => entry.id === saved.id)
        ? current.map((entry) => (entry.id === saved.id ? saved : entry))
        : [...current, saved];
    });
    setEditing(null);
  };

  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <Heading level="h2">{config.labels.title}</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {config.labels.description}
          </Text>
        </div>
        <Button type="button" size="small" variant="secondary" onClick={() => setEditing("new")}>
          <Plus />
          {config.labels.add}
        </Button>
      </div>

      {!items ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <Text size="small" className="text-ui-fg-subtle">
          {config.labels.empty}
        </Text>
      ) : (
        <SortableList
          items={items}
          itemKey={(item) => item.id}
          onMove={(from, to) => void move(from, to)}
          disabled={busy}
        >
          {(item) => (
            <div className="flex items-center gap-3">
              <div className="bg-ui-bg-subtle border-ui-border-base flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border">
                {item.imageDesktop ? (
                  <img src={item.imageDesktop.url} alt="" className="size-full object-cover" />
                ) : (
                  <Photo className="text-ui-fg-muted" aria-hidden />
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Text size="small" weight="plus" className="truncate">
                  {itemTitle(item)}
                </Text>
                <Badge
                  size="2xsmall"
                  color={item.active ? "green" : "grey"}
                  className={clx("w-fit")}
                >
                  {item.active ? t("homeItems.active") : t("homeItems.inactive")}
                </Badge>
              </div>
              <Switch
                checked={item.active}
                aria-label={t("homeItems.activeToggle")}
                onCheckedChange={(checked) => void toggle(item, checked)}
              />
              <IconButton
                type="button"
                size="small"
                variant="transparent"
                aria-label={t("homeItems.edit")}
                onClick={() => setEditing(item)}
              >
                <PencilSquare />
              </IconButton>
              <IconButton
                type="button"
                size="small"
                variant="transparent"
                aria-label={config.labels.deleteTitle}
                onClick={() => void remove(item)}
              >
                <Trash />
              </IconButton>
            </div>
          )}
        </SortableList>
      )}

      {editing ? (
        <Editor
          key={editing === "new" ? "new" : editing.id}
          config={config}
          item={editing === "new" ? null : editing}
          rank={items?.length ?? 0}
          onClose={() => setEditing(null)}
          onSaved={onSaved}
        />
      ) : null}
    </Container>
  );
}
