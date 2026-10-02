import {
  Button,
  Checkbox,
  Container,
  Heading,
  Input,
  Label,
  RadioGroup,
  Select,
  Switch,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { LOCALES, type MediaRef, directionOf } from "@nocido/types";
import { type ReactNode, useId, useRef, useState } from "react";
import { Controller, get, useFormContext } from "react-hook-form";
import { uploadMedia } from "../lib/api";
import { errorMessage, localeLabel, t } from "../lib/i18n";

function useFieldError(name: string): string | undefined {
  const {
    formState: { errors },
  } = useFormContext();
  const error = get(errors, name) as { message?: string } | undefined;
  return error ? errorMessage(error.message) : undefined;
}

export function FieldError({ name }: { name: string }) {
  const message = useFieldError(name);
  return message ? (
    <Text size="small" className="text-ui-fg-error">
      {message}
    </Text>
  ) : null;
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Container className="flex flex-col gap-y-4 px-6 py-4">
      <Heading level="h2">{title}</Heading>
      {children}
    </Container>
  );
}

export function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>;
}

interface TextFieldProps {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "tel" | "password";
  placeholder?: string;
  hint?: string;
  /** Empty input is stored as null instead of "". */
  nullable?: boolean;
  dir?: "ltr" | "rtl";
}

export function TextField({
  name,
  label,
  type = "text",
  placeholder,
  hint,
  nullable,
  dir,
}: TextFieldProps) {
  const id = useId();
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={id}
            type={type}
            dir={dir}
            placeholder={placeholder}
            value={typeof field.value === "string" ? field.value : ""}
            onChange={(event) => {
              const next = event.target.value;
              field.onChange(nullable && next.trim() === "" ? null : next);
            }}
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      {hint ? (
        <Text size="xsmall" className="text-ui-fg-subtle">
          {hint}
        </Text>
      ) : null}
      <FieldError name={name} />
    </div>
  );
}

export function NumberField({
  name,
  label,
  min,
  max,
  step,
}: {
  name: string;
  label: string;
  min?: number;
  max?: number;
  step?: number;
}) {
  const id = useId();
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Input
            id={id}
            type="number"
            min={min}
            max={max}
            step={step}
            value={
              typeof field.value === "number" && Number.isFinite(field.value) ? field.value : ""
            }
            onChange={(event) =>
              field.onChange(event.target.value === "" ? null : Number(event.target.value))
            }
            onBlur={field.onBlur}
            ref={field.ref}
          />
        )}
      />
      <FieldError name={name} />
    </div>
  );
}

export function SwitchField({ name, label }: { name: string; label: string }) {
  const id = useId();
  const { control } = useFormContext();
  return (
    <div className="flex items-center gap-x-3">
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Switch
            id={id}
            checked={field.value === true}
            onCheckedChange={(checked) => field.onChange(checked)}
          />
        )}
      />
      <Label htmlFor={id} size="small">
        {label}
      </Label>
    </div>
  );
}

export function SelectField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            value={typeof field.value === "string" ? field.value : undefined}
            onValueChange={field.onChange}
          >
            <Select.Trigger>
              <Select.Value />
            </Select.Trigger>
            <Select.Content>
              {options.map((option) => (
                <Select.Item key={option.value} value={option.value}>
                  {option.label}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        )}
      />
      <FieldError name={name} />
    </div>
  );
}

export function RadioField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { control } = useFormContext();
  const groupId = useId();
  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus" id={groupId}>
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <RadioGroup
            aria-labelledby={groupId}
            value={typeof field.value === "string" ? field.value : undefined}
            onValueChange={field.onChange}
            className="flex flex-col gap-2"
          >
            {options.map((option) => (
              <div key={option.value} className="flex items-center gap-2">
                <RadioGroup.Item value={option.value} id={`${groupId}-${option.value}`} />
                <Label htmlFor={`${groupId}-${option.value}`} size="small">
                  {option.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}
      />
      <FieldError name={name} />
    </div>
  );
}

export function CheckboxGroupField({
  name,
  label,
  options,
}: {
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  const { control } = useFormContext();
  const groupId = useId();
  return (
    <div className="flex flex-col gap-y-2" role="group" aria-labelledby={groupId}>
      <Label size="small" weight="plus" id={groupId}>
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const selected = Array.isArray(field.value) ? (field.value as string[]) : [];
          return (
            <div className="flex flex-wrap gap-4">
              {options.map((option) => (
                <div key={option.value} className="flex items-center gap-2">
                  <Checkbox
                    id={`${groupId}-${option.value}`}
                    checked={selected.includes(option.value)}
                    onCheckedChange={(checked) =>
                      field.onChange(
                        checked === true
                          ? options
                              .map((item) => item.value)
                              .filter((value) => value === option.value || selected.includes(value))
                          : selected.filter((value) => value !== option.value),
                      )
                    }
                  />
                  <Label htmlFor={`${groupId}-${option.value}`} size="small">
                    {option.label}
                  </Label>
                </div>
              ))}
            </div>
          );
        }}
      />
      <FieldError name={name} />
    </div>
  );
}

/** One input per kit locale, in tabs. Arabic is edited right to left. */
export function LocalizedField({
  name,
  label,
  multiline,
}: {
  name: string;
  label: string;
  multiline?: boolean;
}) {
  const { control } = useFormContext();
  return (
    <div className="flex flex-col gap-y-2">
      <Label size="small" weight="plus">
        {label}
      </Label>
      <Tabs defaultValue={LOCALES[0]}>
        <Tabs.List>
          {LOCALES.map((locale) => (
            <Tabs.Trigger key={locale} value={locale}>
              {localeLabel(locale)}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {LOCALES.map((locale) => (
          <Tabs.Content key={locale} value={locale} className="pt-2">
            <Controller
              control={control}
              name={`${name}.${locale}`}
              render={({ field }) => {
                const common = {
                  dir: directionOf(locale),
                  lang: locale,
                  "aria-label": `${label} (${localeLabel(locale)})`,
                  value: typeof field.value === "string" ? field.value : "",
                  onBlur: field.onBlur,
                };
                // An emptied translation is removed, so the storefront falls back.
                const onChange = (next: string) => field.onChange(next === "" ? undefined : next);
                return multiline ? (
                  <Textarea
                    {...common}
                    rows={4}
                    onChange={(event) => onChange(event.target.value)}
                  />
                ) : (
                  <Input {...common} onChange={(event) => onChange(event.target.value)} />
                );
              }}
            />
          </Tabs.Content>
        ))}
      </Tabs>
      <FieldError name={name} />
    </div>
  );
}

/** Uploads to the Medusa File Module and stores the MediaRef. */
export function MediaField({
  name,
  label,
  accept = "image/*",
}: {
  name: string;
  label: string;
  accept?: string;
}) {
  const { control } = useFormContext();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const id = useId();

  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={id} size="small" weight="plus">
        {label}
      </Label>
      <Controller
        control={control}
        name={name}
        render={({ field }) => {
          const media = field.value as MediaRef | null | undefined;
          const pick = async (file: File | undefined) => {
            if (!file) return;
            setUploading(true);
            try {
              field.onChange(await uploadMedia(file));
            } catch (error) {
              toast.error(t("common.uploadFailed"), {
                description: error instanceof Error ? error.message : undefined,
              });
            } finally {
              setUploading(false);
              if (inputRef.current) inputRef.current.value = "";
            }
          };
          return (
            <div className="flex items-center gap-4">
              <div className="bg-ui-bg-subtle border-ui-border-base flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border">
                {media ? (
                  <img src={media.url} alt="" className="max-h-full max-w-full object-contain" />
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <input
                  ref={inputRef}
                  id={id}
                  type="file"
                  accept={accept}
                  className="sr-only"
                  onChange={(event) => void pick(event.target.files?.[0])}
                />
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  isLoading={uploading}
                  onClick={() => inputRef.current?.click()}
                >
                  {uploading
                    ? t("common.uploading")
                    : media
                      ? t("common.replace")
                      : t("common.upload")}
                </Button>
                {media ? (
                  <Button
                    type="button"
                    size="small"
                    variant="transparent"
                    onClick={() => field.onChange(null)}
                  >
                    {t("common.remove")}
                  </Button>
                ) : null}
              </div>
            </div>
          );
        }}
      />
      <FieldError name={name} />
    </div>
  );
}
