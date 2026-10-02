import { model } from "@medusajs/framework/utils";

/**
 * Home hero slide. Images are File Module MediaRefs, texts are localized
 * records and the link is a HomeLink, all JSON validated with @nocido/types.
 */
const HeroSlide = model.define("hero_slide", {
  id: model.id({ prefix: "hslide" }).primaryKey(),
  active: model.boolean().default(true),
  rank: model.number().default(0),
  image_desktop: model.json().nullable(),
  image_mobile: model.json().nullable(),
  title: model.json(),
  subtitle: model.json(),
  cta_label: model.json(),
  link: model.json().nullable(),
  text_align: model.enum(["start", "center", "end"]).default("start"),
  overlay: model.number().default(30),
  duration_seconds: model.number().default(6),
});

export default HeroSlide;
