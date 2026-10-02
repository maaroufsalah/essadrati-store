import { zodResolver } from "@hookform/resolvers/zod";
import { Badge, Button, Container, Heading, Skeleton, Text, toast } from "@medusajs/ui";
import type { StoreSettings, StoreSettingsUpdate } from "@nocido/types";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import {
  type FieldValues,
  FormProvider,
  type Resolver,
  useForm,
  type UseFormReturn,
} from "react-hook-form";
import type { z } from "zod";
import { ApiRequestError, fetchSettings, saveSettings } from "../lib/api";
import { errorMessage, t } from "../lib/i18n";

/** Loose form values: each page validates them with its zod schema. */
export type FormValues = FieldValues;

interface SettingsFormProps {
  title: string;
  description: string;
  /** Validates the form values (same shapes as @nocido/types, a few UI-only fields allowed). */
  schema: z.ZodType<FieldValues, FieldValues>;
  /** Form values for the current settings. */
  pick: (settings: StoreSettings) => FormValues;
  /** Admin payload sent to the backend. Defaults to the parsed values. */
  toUpdate?: (values: FormValues) => StoreSettingsUpdate;
  children: (form: UseFormReturn<FormValues>, settings: StoreSettings) => ReactNode;
  /** Called after a successful save (e.g. to refresh the admin branding). */
  afterSave?: (settings: StoreSettings) => void;
  /** Extra content beside the form (e.g. a live preview), receives the watched values. */
  aside?: (values: FormValues, settings: StoreSettings) => ReactNode;
}

/**
 * Fields register their key even when empty, so localized records arrive as
 * { ar: undefined }. The schemas expect the key to be absent: drop undefined
 * values before validating.
 */
function stripUndefined(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripUndefined);
  if (value && typeof value === "object" && Object.getPrototypeOf(value) === Object.prototype) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .map(([key, child]) => [key, stripUndefined(child)]),
    );
  }
  return value;
}

function withoutUndefined(resolver: Resolver<FormValues>): Resolver<FormValues> {
  return (values, context, options) =>
    resolver(stripUndefined(values) as FormValues, context, options);
}

/** Loads StoreSettings once; `null` while loading, an Error when it failed. */
function useStoreSettings(): [StoreSettings | null | Error, (next: StoreSettings) => void] {
  const [settings, setSettings] = useState<StoreSettings | null | Error>(null);
  useEffect(() => {
    let active = true;
    fetchSettings()
      .then((loaded) => active && setSettings(loaded))
      .catch((error: unknown) => {
        if (active) setSettings(error instanceof Error ? error : new Error(String(error)));
      });
    return () => {
      active = false;
    };
  }, []);
  return [settings, setSettings];
}

/**
 * Shell shared by every settings page: loads the settings, validates with
 * the shared zod schemas, saves, maps backend issues onto fields, shows an
 * "unsaved" badge and warns before leaving with pending changes.
 */
export function SettingsForm(props: SettingsFormProps) {
  const [settings, setSettings] = useStoreSettings();

  if (settings instanceof Error) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-error">{t("common.loadFailed")}</Text>
      </Container>
    );
  }
  if (!settings) {
    return (
      <Container className="flex flex-col gap-4 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </Container>
    );
  }
  return <LoadedSettingsForm {...props} settings={settings} onSaved={setSettings} />;
}

function LoadedSettingsForm({
  title,
  description,
  schema,
  pick,
  toUpdate,
  children,
  aside,
  afterSave,
  settings,
  onSaved,
}: SettingsFormProps & { settings: StoreSettings; onSaved: (next: StoreSettings) => void }) {
  const form = useForm<FormValues>({
    resolver: withoutUndefined(zodResolver(schema)),
    defaultValues: pick(settings),
    mode: "onBlur",
  });
  const { isSubmitting, dirtyFields } = form.formState;
  // formState.isDirty compares whole objects: a localized field registering an
  // undefined locale key is enough to flip it. dirtyFields is per field.
  const isDirty = Object.keys(dirtyFields).length > 0;

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  const submit = useCallback(
    async (values: FormValues) => {
      try {
        const saved = await saveSettings(toUpdate ? toUpdate(values) : values);
        onSaved(saved);
        afterSave?.(saved);
        form.reset(pick(saved));
        toast.success(t("common.saved"));
      } catch (error) {
        if (error instanceof ApiRequestError && error.issues.length > 0) {
          for (const issue of error.issues) {
            if (issue.path) form.setError(issue.path, { message: issue.code });
          }
          toast.error(t("common.invalid"), {
            description: [...new Set(error.issues.map((issue) => errorMessage(issue.code)))].join(
              " · ",
            ),
          });
          return;
        }
        toast.error(t("common.saveFailed"), {
          description: error instanceof Error ? error.message : undefined,
        });
      }
    },
    [afterSave, form, onSaved, pick, toUpdate],
  );

  const values = form.watch();

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(event) => {
          void form.handleSubmit(submit, () => toast.error(t("common.invalid")))(event);
        }}
        className="flex flex-col gap-y-3"
        noValidate
      >
        <Container className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Heading level="h1">{title}</Heading>
              {isDirty ? (
                <Badge color="orange" size="2xsmall">
                  {t("common.unsaved")}
                </Badge>
              ) : null}
            </div>
            <Text size="small" className="text-ui-fg-subtle">
              {description}
            </Text>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={!isDirty || isSubmitting}
              onClick={() => form.reset(pick(settings))}
            >
              {t("common.reset")}
            </Button>
            <Button type="submit" size="small" isLoading={isSubmitting} disabled={!isDirty}>
              {isSubmitting ? t("common.saving") : t("common.save")}
            </Button>
          </div>
        </Container>
        {aside ? (
          <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_420px]">
            <div className="flex flex-col gap-y-3">{children(form, settings)}</div>
            <div className="xl:sticky xl:top-3 xl:self-start">{aside(values, settings)}</div>
          </div>
        ) : (
          children(form, settings)
        )}
      </form>
    </FormProvider>
  );
}
