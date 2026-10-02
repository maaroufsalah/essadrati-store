import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import ManualCodFulfillmentService from "./service";

export const MANUAL_COD_PROVIDER_ID = "manual-cod_manual-cod";

export default ModuleProvider(Modules.FULFILLMENT, {
  services: [ManualCodFulfillmentService],
});
