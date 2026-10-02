import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { categoryBannerInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../lib/revalidate";
import { sendInvalid, zodIssues } from "../../../lib/validation";
import { CATEGORY_BANNERS_MODULE } from "../../../modules/category-banners";
import type CategoryBannersModuleService from "../../../modules/category-banners/service";

/** GET /admin/category-banners: every banner by rank, inactive ones included. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  res.json({ banners: await service.listBanners() });
}

/** POST /admin/category-banners */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = categoryBannerInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  const banner = await service.saveBanner(parsed.data);
  await revalidateStorefront(
    [CACHE_TAGS.categoryBanners],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.status(201).json({ banner });
}
