import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { categoryBannerInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../../lib/revalidate";
import { routeParam, sendInvalid, zodIssues } from "../../../../lib/validation";
import { CATEGORY_BANNERS_MODULE } from "../../../../modules/category-banners";
import type CategoryBannersModuleService from "../../../../modules/category-banners/service";

/** GET /admin/category-banners/:id */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  res.json({ banner: await service.getBanner(routeParam(req, "id")) });
}

/** POST /admin/category-banners/:id (full replacement of the editable fields) */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = categoryBannerInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  const banner = await service.saveBanner(parsed.data, routeParam(req, "id"));
  await revalidateStorefront(
    [CACHE_TAGS.categoryBanners],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ banner });
}

/** DELETE /admin/category-banners/:id */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  const id = routeParam(req, "id");
  await service.deleteCategoryBanners(id);
  await revalidateStorefront(
    [CACHE_TAGS.categoryBanners],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ id, deleted: true });
}
