import { Module } from "@medusajs/framework/utils";
import MoroccanCitiesModuleService from "./service";

export const MOROCCAN_CITIES_MODULE = "moroccanCities";

export default Module(MOROCCAN_CITIES_MODULE, {
  service: MoroccanCitiesModuleService,
});

export type { ResolvedCity } from "./lib/cities";
export { MoroccanCitiesModuleService };
