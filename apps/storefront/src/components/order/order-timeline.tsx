import type { CodOrderTracking } from "@nocido/types";
import { Check, CircleDot, PackageCheck, Phone, Truck, X } from "lucide-react";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { formatDate, type StoreFormat } from "@/lib/format";
import { cn } from "@/lib/utils";

const ICONS: Record<CodOrderTracking["timeline"][number]["step"], ReactNode> = {
  placed: <CircleDot aria-hidden />,
  confirmed: <Phone aria-hidden />,
  shipped: <Truck aria-hidden />,
  delivered: <PackageCheck aria-hidden />,
  cancelled: <X aria-hidden />,
};

/** Vertical COD timeline: reached steps with their date, the current one highlighted. */
export async function OrderTimeline({
  order,
  format,
}: {
  order: CodOrderTracking;
  format: StoreFormat;
}) {
  const t = await getTranslations("order.tracking");
  const current = order.timeline.findLastIndex((entry) => entry.done);
  return (
    <ol aria-label={t("progress")} className="flex flex-col">
      {order.timeline.map((entry, index) => {
        const isCurrent = index === current;
        const cancelled = entry.step === "cancelled";
        const last = index === order.timeline.length - 1;
        return (
          <li
            key={entry.step}
            aria-current={isCurrent ? "step" : undefined}
            className="relative flex gap-4 pb-6 last:pb-0"
          >
            {!last ? (
              <span
                aria-hidden
                className={cn(
                  "absolute start-5 top-10 bottom-0 w-0.5 -translate-x-1/2 rtl:translate-x-1/2",
                  entry.done && order.timeline[index + 1]?.done ? "bg-primary" : "bg-border",
                )}
              />
            ) : null}
            <span
              className={cn(
                "relative flex size-10 shrink-0 items-center justify-center rounded-full border-2 [&_svg]:size-5",
                cancelled
                  ? "border-danger bg-danger text-bg"
                  : entry.done
                    ? "border-primary bg-primary text-primary-fg"
                    : "border-border bg-card text-muted-fg",
                isCurrent && !cancelled && "ring-primary/30 ring-4",
              )}
            >
              {entry.done && !isCurrent && !cancelled ? <Check aria-hidden /> : ICONS[entry.step]}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5 pt-2">
              <span
                className={cn(
                  "font-semibold",
                  entry.done ? "text-fg" : "text-muted-fg",
                  cancelled && "text-danger",
                )}
              >
                {t(`steps.${entry.step}`)}
                {isCurrent ? <span className="sr-only"> ({t("current")})</span> : null}
              </span>
              {entry.at ? (
                <time dateTime={entry.at} className="text-muted-fg text-sm">
                  {formatDate(entry.at, format)}
                </time>
              ) : null}
              {isCurrent ? <p className="text-fg text-sm">{t(`hints.${entry.step}`)}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
