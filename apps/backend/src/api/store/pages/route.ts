import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { PAGES_MODULE } from "../../../modules/pages";
import type PagesModuleService from "../../../modules/pages/service";

/** GET /store/pages: published pages without content (footer, sitemap). */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.json({ pages: await service.listPublishedSummaries() });
}
