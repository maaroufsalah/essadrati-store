"use client";

import type { Locale } from "@nocido/types";
import { Menu } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import type { NavItem } from "./nav-items";

interface MobileNavProps {
  storeName: string;
  items: NavItem[];
  locales: Locale[];
}

/** Drawer menu for small screens, opening from the reading start side. */
export function MobileNav({ storeName, items, locales }: MobileNavProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label={t("header.openMenu")}>
          <Menu aria-hidden />
        </Button>
      </SheetTrigger>
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
