import { googleFontsUrl } from "@nocido/theme";
import type { ThemeConfig } from "@nocido/types";
import { useEffect } from "react";

/** Loads the Google Fonts CSS of the theme fonts, for admin previews only. */
export function usePreviewFonts(config: ThemeConfig | null) {
  const href = config ? googleFontsUrl([config.fonts.display, config.fonts.body]) : null;
  useEffect(() => {
    if (!href) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
}
