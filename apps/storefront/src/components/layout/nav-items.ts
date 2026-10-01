/**
 * Main navigation. Labels are message keys; catalog entries (categories)
 * will come from Medusa in the catalog step.
 */
export interface NavItem {
  href: string;
  labelKey: "common.home";
}

export const NAV_ITEMS: NavItem[] = [{ href: "/", labelKey: "common.home" }];
