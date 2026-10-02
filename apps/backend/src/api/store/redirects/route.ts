import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { REDIRECTS_MODULE } from "../../../modules/redirects";
import type RedirectsModuleService from "../../../modules/redirects/service";

/** GET /store/redirects: permanent redirects, read by the storefront middleware. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<RedirectsModuleService>(REDIRECTS_MODULE);
  res.setHeader("Cache-Control", "public, max-age=60");
  res.json({ redirects: await service.listRows() });
}
