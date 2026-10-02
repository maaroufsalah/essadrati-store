"use client";

import { type CodCity, type Locale, resolveLocalized } from "@nocido/types";
import { useTranslations } from "next-intl";
import { useId } from "react";
import { FieldMessage, Input, Label } from "@/components/ui/input";
import type { CodErrorKey } from "@/lib/cod-form";

export interface CodFieldValues {
  name: string;
  phone: string;
  cityId: string;
}

interface CodFieldsProps {
  locale: Locale;
  cities: CodCity[];
  values: CodFieldValues;
  onChange: (values: CodFieldValues) => void;
  errors: Partial<Record<string, CodErrorKey>>;
  /** Extra content on the city row, e.g. the quantity stepper. */
  cityAside?: React.ReactNode;
}

/** Name, Moroccan phone and city: the COD customer fields (controlled). */
export function CodFields({ locale, cities, values, onChange, errors, cityAside }: CodFieldsProps) {
  const t = useTranslations("cod");
  const id = useId();
  const set = (patch: Partial<CodFieldValues>) => onChange({ ...values, ...patch });

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-name`}>{t("name")}</Label>
        <Input
          id={`${id}-name`}
          name="name"
          value={values.name}
          onChange={(event) => set({ name: event.target.value })}
          autoComplete="name"
          required
          placeholder={t("namePlaceholder")}
          aria-invalid={errors.name ? true : undefined}
          aria-describedby={errors.name ? `${id}-name-error` : undefined}
        />
        {errors.name ? (
          <FieldMessage id={`${id}-name-error`}>{t(`errors.${errors.name}`)}</FieldMessage>
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-phone`}>{t("phone")}</Label>
        <Input
          id={`${id}-phone`}
          name="phone"
          value={values.phone}
          onChange={(event) => set({ phone: event.target.value })}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          required
          placeholder={t("phonePlaceholder")}
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={`${id}-phone-hint${errors.phone ? ` ${id}-phone-error` : ""}`}
          className="text-start"
        />
        <p id={`${id}-phone-hint`} className="text-muted-fg text-xs">
          {t("phoneHint")}
        </p>
        {errors.phone ? (
          <FieldMessage id={`${id}-phone-error`}>{t(`errors.${errors.phone}`)}</FieldMessage>
        ) : null}
      </div>

      <div className={cityAside ? "grid grid-cols-[minmax(0,1fr)_auto] gap-3" : "flex flex-col"}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`${id}-city`}>{t("city")}</Label>
          <select
            id={`${id}-city`}
            name="city_id"
            required
            value={values.cityId}
            onChange={(event) => set({ cityId: event.target.value })}
            aria-invalid={errors.city ? true : undefined}
            aria-describedby={errors.city ? `${id}-city-error` : undefined}
            className="rounded-base border-border bg-card text-card-fg focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-danger h-12 w-full border px-3 text-base outline-none focus-visible:ring-4"
          >
            <option value="">{t("cityPlaceholder")}</option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {resolveLocalized(city.name, locale, ["fr"])}
              </option>
            ))}
          </select>
          {errors.city ? (
            <FieldMessage id={`${id}-city-error`}>{t(`errors.${errors.city}`)}</FieldMessage>
          ) : null}
        </div>
        {cityAside}
      </div>
    </>
  );
}
