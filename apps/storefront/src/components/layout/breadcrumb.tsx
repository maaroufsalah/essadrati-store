import { ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";

export interface Crumb {
  label: string;
  href?: string;
}

/** Breadcrumb trail; the last crumb is the current page. */
export function Breadcrumb({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="text-muted-fg flex flex-wrap items-center gap-1 text-sm">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 ? (
              <>
                <ChevronRight className="size-3.5 rtl:hidden" aria-hidden />
                <ChevronLeft className="size-3.5 ltr:hidden" aria-hidden />
              </>
            ) : null}
            {item.href && index < items.length - 1 ? (
              <Link
                href={item.href}
                prefetch={false}
                className="hover:text-fg underline-offset-4 hover:underline"
              >
                {item.label}
              </Link>
            ) : (
              <span
                aria-current={index === items.length - 1 ? "page" : undefined}
                className="text-fg"
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
