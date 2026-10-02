import { Module } from "@medusajs/framework/utils";
import RedirectsModuleService from "./service";

export const REDIRECTS_MODULE = "redirects";

export default Module(REDIRECTS_MODULE, { service: RedirectsModuleService });

export { RedirectsModuleService };
