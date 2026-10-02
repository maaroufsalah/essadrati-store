import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { CATEGORY_BANNERS_MODULE } from "../../../modules/category-banners";
import type CategoryBannersModuleService from "../../../modules/category-banners/service";

/** GET /store/category-banners: active banners by rank. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.json({ banners: await service.listBanners({ activeOnly: true }) });
}
