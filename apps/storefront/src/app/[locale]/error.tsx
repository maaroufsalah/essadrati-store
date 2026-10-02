"use client";

import { RotateCcw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

/**
 * Branded 500: a rendering error inside a page keeps the header and footer
 * of the locale layout, offers a retry and a way back.
 */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errorPage");
  useEffect(() => {
    console.error("[storefront] page error", error.digest ?? error.message);
  }, [error]);
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-primary text-6xl font-bold">{t("code")}</p>
      <h1 className="text-fg text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-fg">{t("description")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={reset}>
          <RotateCcw aria-hidden />
          {t("retry")}
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
      {error.digest ? (
        <p className="text-muted-fg text-xs">
          <bdi dir="ltr">{error.digest}</bdi>
        </p>
      ) : null}
    </section>
  );
}
