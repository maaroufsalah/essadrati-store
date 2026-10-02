import { model } from "@medusajs/framework/utils";
import Zone from "./zone";

/**
 * City offered in the COD form. Fee and delay fall back to the zone when
 * null. `slug` is the stable key used by CSV imports.
 */
const City = model.define("cod_city", {
  id: model.id({ prefix: "codc" }).primaryKey(),
  slug: model.text().unique(),
  name: model.json(),
  fee: model.float().nullable(),
  delivery_days_min: model.number().nullable(),
  delivery_days_max: model.number().nullable(),
  is_active: model.boolean().default(true),
  rank: model.number().default(0),
  zone: model.belongsTo(() => Zone, { mappedBy: "cities" }),
});

export default City;
