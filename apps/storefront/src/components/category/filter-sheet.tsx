"use client";

import { SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { FiltersForm, type FiltersFormProps } from "./filters-form";

/** Mobile and tablet filters in a bottom sheet; desktop uses the sidebar. */
export function FilterSheet({ activeCount, ...props }: FiltersFormProps & { activeCount: number }) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="md" className="lg:hidden">
          <SlidersHorizontal aria-hidden />
          {t("category.filters")}
          {activeCount > 0 ? <Badge variant="primary">{activeCount}</Badge> : null}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" closeLabel={t("common.close")} aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{t("category.filters")}</SheetTitle>
        </SheetHeader>
        <div className="overflow-y-auto px-5 pb-6">
          <FiltersForm {...props} onApplied={() => setOpen(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
