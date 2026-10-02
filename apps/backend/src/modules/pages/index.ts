import { Module } from "@medusajs/framework/utils";
import PagesModuleService from "./service";

export const PAGES_MODULE = "pages";

export default Module(PAGES_MODULE, { service: PagesModuleService });

export { PagesModuleService };
