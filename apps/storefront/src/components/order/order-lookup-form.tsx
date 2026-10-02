"use client";

import type { Locale } from "@nocido/types";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useActionState, useId, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { FieldMessage, Input, Label } from "@/components/ui/input";
import { lookupOrder } from "@/lib/order-lookup";
import { LOOKUP_IDLE } from "@/lib/order-lookup-state";

/** Order number + phone; opens the tracking page when both match. */
export function OrderLookupForm({ locale }: { locale: Locale }) {
  const t = useTranslations("order.lookup");
  const id = useId();
  const [state, action, pending] = useActionState(lookupOrder, LOOKUP_IDLE);
  const [, startTransition] = useTransition();
  const [values, setValues] = useState({ number: "", phone: "" });
  const errors = state.status === "error" ? state.fieldErrors : {};

  return (
    <form
      action={action}
      onSubmit={(event) => {
        // Controlled fields survive a refused lookup (React resets forms after an action).
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        startTransition(() => action(data));
      }}
      noValidate
      className="rounded-card border-border bg-card flex flex-col gap-4 border p-5 sm:p-6"
    >
      <input type="hidden" name="locale" value={locale} />
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-number`}>{t("number")}</Label>
        <Input
          id={`${id}-number`}
          name="number"
          inputMode="numeric"
          dir="ltr"
          value={values.number}
          onChange={(event) => setValues({ ...values, number: event.target.value })}
          placeholder={t("numberPlaceholder")}
          required
          aria-invalid={errors.number ? true : undefined}
          aria-describedby={errors.number ? `${id}-number-error` : undefined}
          className="text-start"
        />
        {errors.number ? (
          <FieldMessage id={`${id}-number-error`}>{t(`errors.${errors.number}`)}</FieldMessage>
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`${id}-phone`}>{t("phone")}</Label>
        <Input
          id={`${id}-phone`}
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          dir="ltr"
          value={values.phone}
          onChange={(event) => setValues({ ...values, phone: event.target.value })}
          required
          aria-invalid={errors.phone ? true : undefined}
          aria-describedby={errors.phone ? `${id}-phone-error` : undefined}
          className="text-start"
        />
        {errors.phone ? (
          <FieldMessage id={`${id}-phone-error`}>{t(`errors.${errors.phone}`)}</FieldMessage>
        ) : null}
      </div>
      {state.status === "error" && state.formError ? (
        <p role="alert" className="rounded-base bg-danger/10 text-danger p-3 text-sm">
          {t(`errors.${state.formError}`)}
        </p>
      ) : null}
      <Button type="submit" size="lg" disabled={pending}>
        <Search aria-hidden />
        {pending ? t("submitting") : t("submit")}
      </Button>
    </form>
  );
}
