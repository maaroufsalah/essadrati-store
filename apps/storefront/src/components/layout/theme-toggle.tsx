"use client";

import { THEME_MODES, type ThemeMode } from "@nocido/types/client";
import { Monitor, Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

const subscribe = () => () => undefined;

/** True once hydrated: the stored theme is only known on the client. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
}

function isThemeMode(value: string | undefined): value is ThemeMode {
  return (THEME_MODES as readonly (string | undefined)[]).includes(value);
}

/** Cycles light, dark and system. */
export function ThemeToggle() {
  const t = useTranslations("theme");
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();

  const current: ThemeMode = hydrated && isThemeMode(theme) ? theme : "system";
  const next = THEME_MODES[(THEME_MODES.indexOf(current) + 1) % THEME_MODES.length] ?? "system";
  const Icon = ICONS[current];

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(next)}
      aria-label={`${t("label")}: ${t(current)}`}
      title={`${t("label")}: ${t(current)}`}
    >
      <Icon aria-hidden />
    </Button>
  );
}
