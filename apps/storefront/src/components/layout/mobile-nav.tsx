"use client";

import { Menu } from "lucide-react";
import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MobileNavProps } from "./mobile-nav-panel";

const MobileNavPanel = dynamic(
  () => import("./mobile-nav-panel").then((module) => module.MobileNavPanel),
  { ssr: false },
);

/**
 * Menu button for small screens. The drawer (and its dialog code) is loaded
 * on the first tap, so it stays out of the initial bundle.
 */
export function MobileNav(props: MobileNavProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        aria-label={t("header.openMenu")}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setLoaded(true);
          setOpen(true);
        }}
      >
        <Menu aria-hidden />
      </Button>
      {loaded ? <MobileNavPanel {...props} open={open} setOpen={setOpen} /> : null}
    </>
  );
}
