import { model } from "@medusajs/framework/utils";
import City from "./city";

/**
 * Delivery zone: default fee (major units, store currency) and delay for
 * every city it contains. Names are localized ({ ar, fr, en }).
 */
const Zone = model.define("cod_zone", {
  id: model.id({ prefix: "codz" }).primaryKey(),
  code: model.text().unique(),
  name: model.json(),
  fee: model.float(),
  delivery_days_min: model.number(),
  delivery_days_max: model.number(),
  cities: model.hasMany(() => City, { mappedBy: "zone" }),
});

export default Zone;
