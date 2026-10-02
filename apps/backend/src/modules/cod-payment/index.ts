import { ModuleProvider, Modules } from "@medusajs/framework/utils";
import CodPaymentProviderService from "./service";

export const COD_PAYMENT_PROVIDER_ID = "pp_cod_cod";

export default ModuleProvider(Modules.PAYMENT, {
  services: [CodPaymentProviderService],
});
