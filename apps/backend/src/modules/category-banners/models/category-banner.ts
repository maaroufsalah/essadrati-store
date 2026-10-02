import { model } from "@medusajs/framework/utils";

/**
 * Large category banner of the home page (« Nos univers »). Not tied to a
 * product category row: a banner may also point to a product, a gift
 * collection page or any URL.
 */
const CategoryBanner = model.define("category_banner", {
  id: model.id({ prefix: "cbanner" }).primaryKey(),
  active: model.boolean().default(true),
  rank: model.number().default(0),
  image_desktop: model.json().nullable(),
  image_mobile: model.json().nullable(),
  title: model.json(),
  tagline: model.json(),
  cta_label: model.json(),
  link: model.json().nullable(),
});

export default CategoryBanner;
