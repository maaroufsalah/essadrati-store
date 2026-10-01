import type { ReactNode } from "react";

/**
 * The real root layout is app/[locale]/layout.tsx (it owns <html lang dir>).
 * This pass-through exists so app/not-found.tsx has a parent layout.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return children;
}
