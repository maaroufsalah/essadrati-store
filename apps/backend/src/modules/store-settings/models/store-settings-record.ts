import { model } from "@medusajs/framework/utils";

/**
 * Single-row table holding the StoreSettings of this store.
 * `data` is validated with the @nocido/types schema on every read and write.
 * `smtp_password` is AES-256-GCM encrypted and never leaves the backend.
 */
const StoreSettingsRecord = model.define("store_settings", {
  id: model.id({ prefix: "stset" }).primaryKey(),
  data: model.json(),
  smtp_password: model.text().nullable(),
});

export default StoreSettingsRecord;
