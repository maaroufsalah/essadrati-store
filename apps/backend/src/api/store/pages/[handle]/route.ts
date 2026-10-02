import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { routeParam } from "../../../../lib/validation";
import { PAGES_MODULE } from "../../../../modules/pages";
import type PagesModuleService from "../../../../modules/pages/service";

/** GET /store/pages/:handle: one published page with its content, 404 otherwise. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.json({ page: await service.getPublishedPage(routeParam(req, "handle")) });
}
