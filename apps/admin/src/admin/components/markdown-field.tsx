import { Label, Tabs, Text, Textarea } from "@medusajs/ui";
import { directionOf, LOCALES } from "@nocido/types";
import Markdown from "react-markdown";
import { Controller, useFormContext, useWatch } from "react-hook-form";
import remarkGfm from "remark-gfm";
import { localeLabel, t } from "../lib/i18n";
import { FieldError } from "./fields";

function Preview({ name, locale }: { name: string; locale: string }) {
  const { control } = useFormContext();
  const value = useWatch({ control, name: `${name}.${locale}` }) as string | undefined;
  return (
    <div
      dir={directionOf(locale as (typeof LOCALES)[number])}
      lang={locale}
      className="txt-small border-ui-border-base bg-ui-bg-subtle prose-sm max-h-[480px] overflow-auto rounded-lg border p-4 [&_a]:underline [&_h2]:mb-2 [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:mb-1 [&_h3]:font-semibold [&_li]:ms-4 [&_li]:list-disc [&_p]:mb-3"
    >
      {/* react-markdown renders no raw HTML: the content stays safe. */}
      <Markdown remarkPlugins={[remarkGfm]}>{value ?? ""}</Markdown>
    </div>
  );
}

/** Markdown per locale, editor and live preview side by side. */
export function MarkdownField({ name, label }: { name: string; label: string }) {
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {label}
      </Label>
      <Text size="xsmall" className="text-ui-fg-subtle">
        {t("pages.contentHint")}
      </Text>
      <Tabs defaultValue={LOCALES[0]}>
        <Tabs.List>
          {LOCALES.map((locale) => (
            <Tabs.Trigger key={locale} value={locale}>
              {localeLabel(locale)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {LOCALES.map((locale) => (
          <Tabs.Content key={locale} value={locale} className="grid gap-3 pt-2 lg:grid-cols-2">
            <Controller
              control={control}
              name={`${name}.${locale}`}
              render={({ field }) => (
                <Textarea
                  dir={directionOf(locale)}
                  lang={locale}
                  rows={18}
                  aria-label={`${label} (${localeLabel(locale)})`}
                  className="font-mono"
                  value={typeof field.value === "string" ? field.value : ""}
                  onChange={(event) =>
                    field.onChange(event.target.value === "" ? undefined : event.target.value)
                  }
                  onBlur={field.onBlur}
                />
              )}
            />
            <div className="flex flex-col gap-1">
              <Text size="xsmall" className="text-ui-fg-subtle">
                {t("pages.preview")}
              </Text>
              <Preview name={name} locale={locale} />
            </div>
          </Tabs.Content>
        ))}
      </Tabs>
      <FieldError name={name} />
    </div>
  );
}
