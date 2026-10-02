import { Module } from "@medusajs/framework/utils";
import CategoryBannersModuleService from "./service";

export const CATEGORY_BANNERS_MODULE = "categoryBanners";

export default Module(CATEGORY_BANNERS_MODULE, { service: CategoryBannersModuleService });

export { CategoryBannersModuleService };
