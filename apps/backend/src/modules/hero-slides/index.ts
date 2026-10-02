import { Module } from "@medusajs/framework/utils";
import HeroSlidesModuleService from "./service";

export const HERO_SLIDES_MODULE = "heroSlides";

export default Module(HERO_SLIDES_MODULE, { service: HeroSlidesModuleService });

export { HeroSlidesModuleService };
