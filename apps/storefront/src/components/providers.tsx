"use client";

import type { ThemeMode } from "@nocido/types";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client providers. next-themes sets the `.dark` class with a blocking inline
 * script before the first paint, so the stored or system mode never flashes.
 * The default mode comes from StoreSettings.theme.defaultMode.
 */
export function Providers({
  defaultMode,
  children,
}: {
  defaultMode: ThemeMode;
  children: ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme={defaultMode}
      enableSystem
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}
