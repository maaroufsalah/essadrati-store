import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <section className="mx-auto flex max-w-xl flex-col items-center gap-4 px-4 py-24 text-center">
      <p className="font-display text-primary text-6xl font-bold" aria-hidden>
        <bdi dir="ltr">404</bdi>
      </p>
      <h1 className="text-fg text-3xl font-bold">{t("title")}</h1>
      <p className="text-muted-fg">{t("description")}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link href="/products">{t("browse")}</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </section>
  );
}
