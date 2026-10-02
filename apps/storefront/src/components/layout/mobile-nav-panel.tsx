"use client";

import type { Locale } from "@nocido/types";
import { useTranslations } from "next-intl";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import type { NavItem } from "./nav-items";

export interface MobileNavProps {
  storeName: string;
  items: NavItem[];
  locales: Locale[];
}

/** Drawer menu for small screens, opening from the reading start side. */
export function MobileNavPanel({
  storeName,
  items,
  locales,
  open,
  setOpen,
}: MobileNavProps & { open: boolean; setOpen: (open: boolean) => void }) {
  const t = useTranslations();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="start" closeLabel={t("common.close")} aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{storeName}</SheetTitle>
        </SheetHeader>
        <nav aria-label={t("header.mainNavigation")} className="flex flex-col px-3">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="touch-target rounded-base text-fg hover:bg-muted flex items-center px-3 text-lg"
            >
              {t(item.labelKey)}
            </Link>
          ))}
        </nav>
        <LanguageSwitcher locales={locales} className="mt-auto flex-wrap px-5 pb-6" />
      </SheetContent>
    </Sheet>
  );
}
