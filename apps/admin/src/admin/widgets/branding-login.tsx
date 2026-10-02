import { defineWidgetConfig } from "@medusajs/admin-sdk";
import { useBranding } from "../lib/branding";

/** Store logo above the login form (light and dark variants). */
const BrandingLogin = () => {
  const branding = useBranding();
  if (!branding || (!branding.logoLight && !branding.logoDark)) return null;
  const light = branding.logoLight ?? branding.logoDark;
  const dark = branding.logoDark ?? branding.logoLight;
  return (
    <div className="mb-6 flex justify-center">
      {light ? <img src={light} alt="" className="h-12 w-auto dark:hidden" /> : null}
      {dark ? <img src={dark} alt="" className="hidden h-12 w-auto dark:block" /> : null}
    </div>
  );
};

export const config = defineWidgetConfig({ zone: "login.before" });

export default BrandingLogin;
