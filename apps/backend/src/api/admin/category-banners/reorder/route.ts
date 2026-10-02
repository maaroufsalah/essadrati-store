import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { reorderInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../../lib/revalidate";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { CATEGORY_BANNERS_MODULE } from "../../../../modules/category-banners";
import type CategoryBannersModuleService from "../../../../modules/category-banners/service";

/** POST /admin/category-banners/reorder { ids }: every banner id, first shown first. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = reorderInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<CategoryBannersModuleService>(CATEGORY_BANNERS_MODULE);
  const banners = await service.reorderBanners(parsed.data.ids);
  await revalidateStorefront(
    [CACHE_TAGS.categoryBanners],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ banners });
}
