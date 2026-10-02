"use client";

import { type FormEvent, useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Turns a GET form into a client-side URL update. Without JavaScript the
 * form still submits natively, so filters work everywhere.
 * Empty fields are dropped and the page is reset to 1.
 */
export function useUrlForm() {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      if (typeof value === "string" && value.trim() !== "") params.append(key, value.trim());
    }
    const query = params.toString();
    startTransition(() => {
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    });
  };

  return {
    pending,
    onSubmit: (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      apply(event.currentTarget);
    },
    /** Applies immediately when a field changes (checkboxes, selects). */
    onChange: (event: FormEvent<HTMLFormElement>) => apply(event.currentTarget),
  };
}
