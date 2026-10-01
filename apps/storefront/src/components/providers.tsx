"use client";

import type { ThemeMode } from "@nocido/types";
import { MotionConfig } from "motion/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * Client providers. next-themes sets the `.dark` class with a blocking inline
 * script before the first paint, so the stored or system mode never flashes.
 * The default mode comes from StoreSettings.theme.defaultMode.
 * MotionConfig makes every motion animation honour prefers-reduced-motion.
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
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </ThemeProvider>
  );
}
