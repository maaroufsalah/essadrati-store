import { useEffect, useState } from "react";
import overrides from "../styles/admin-overrides.css?raw";
import { adminFetch } from "./api";

export interface Branding {
  logoLight: string | null;
  logoDark: string | null;
  light: { primary: string; primaryFg: string };
  dark: { primary: string; primaryFg: string };
  buttonRadius: number;
}

const STYLE_ID = "nocido-admin-overrides";
let pending: Promise<Branding | null> | null = null;

/** Injects the override stylesheet once (a plugin cannot ship global CSS otherwise). */
function injectStylesheet(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = overrides;
  document.head.appendChild(style);
}

function applyBranding(branding: Branding): void {
  const root = document.documentElement.style;
  root.setProperty("--nocido-primary-light", branding.light.primary);
  root.setProperty("--nocido-primary-fg-light", branding.light.primaryFg);
  root.setProperty("--nocido-primary-dark", branding.dark.primary);
  root.setProperty("--nocido-primary-fg-dark", branding.dark.primaryFg);
  root.setProperty("--nocido-button-radius", `${branding.buttonRadius}px`);
  document.documentElement.dataset.nocidoBranding = "";
}

/** Loads /branding once per page load and applies it. Never throws. */
export function loadBranding(): Promise<Branding | null> {
  pending ??= adminFetch<{ branding: Branding }>("/branding")
    .then(({ branding }) => {
      injectStylesheet();
      applyBranding(branding);
      return branding;
    })
    .catch(() => null);
  return pending;
}

/** Re-applies after a theme save, without a page reload. */
export function refreshBranding(): void {
  pending = null;
  void loadBranding();
}

export function useBranding(): Branding | null {
  const [branding, setBranding] = useState<Branding | null>(null);
  useEffect(() => {
    let active = true;
    void loadBranding().then((loaded) => {
      if (active) setBranding(loaded);
    });
    return () => {
      active = false;
    };
  }, []);
  return branding;
}
