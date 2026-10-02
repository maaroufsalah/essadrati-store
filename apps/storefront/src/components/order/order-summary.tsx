import type { CodOrderTracking } from "@nocido/types";
import { getTranslations } from "next-intl/server";
import { ProductImage } from "@/components/commerce/product-image";
import { Link } from "@/i18n/navigation";
import { formatNumber, formatPrice, type StoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

/** Ordered items and totals, as charged by the backend. */
export async function OrderSummary({
  order,
  format,
}: {
  order: CodOrderTracking;
  format: StoreFormat;
}) {
  const t = await getTranslations();
  const freeShipping = order.shipping_total === 0;
  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-card-fg text-lg font-bold">{t("order.tracking.items")}</h2>
      <ul className="flex flex-col gap-3">
        {order.items.map((item) => {
          const title = (
            <span className="text-card-fg line-clamp-2 text-sm font-semibold">{item.title}</span>
          );
          return (
            <li key={item.id} className="flex items-center gap-3">
              <div className="rounded-base relative w-16 shrink-0 overflow-hidden">
                <ProductImage src={item.thumbnail} alt="" sizes="64px" />
                <span className="bg-fg text-bg absolute end-1 top-1 rounded-full px-1.5 text-[11px] font-bold tabular-nums">
                  {formatNumber(item.quantity, format)}
                </span>
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                {item.product_handle ? (
                  <Link href={`/p/${item.product_handle}`} className="hover:underline">
                    {title}
                  </Link>
                ) : (
                  title
                )}
                {item.variant_title ? (
                  <bdi dir="ltr" className="text-muted-fg self-start text-xs">
                    {item.variant_title}
                  </bdi>
                ) : null}
              </div>
              <span className="text-card-fg text-sm font-semibold tabular-nums">
                {formatPrice(item.total, format)}
              </span>
            </li>
          );
        })}
      </ul>
      <dl className="border-border flex flex-col gap-2 border-t pt-4 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-fg">{t("cod.subtotal")}</dt>
          <dd className="text-card-fg tabular-nums">{formatPrice(order.item_total, format)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-fg">{t("cod.shipping")}</dt>
          <dd
            className={cn(
              "tabular-nums",
              freeShipping ? "text-success font-semibold" : "text-card-fg",
            )}
          >
            {freeShipping ? t("cod.free") : formatPrice(order.shipping_total, format)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-base font-bold">
          <dt className="text-card-fg">{t("cod.total")}</dt>
          <dd className="text-card-fg tabular-nums">{formatPrice(order.total, format)}</dd>
        </div>
      </dl>
      <p className="text-muted-fg text-xs">{t("order.tracking.payment")}</p>
    </div>
  );
}
