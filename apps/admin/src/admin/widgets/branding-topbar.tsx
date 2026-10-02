import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useBranding } from "../lib/branding";

/** Mounted in the top bar of every page: applies the store branding to the admin. */
const BrandingTopbar = () => {
  useBranding();
  return null;
};

export const config = defineWidgetConfig({ zone: "topbar" });

export default BrandingTopbar;
