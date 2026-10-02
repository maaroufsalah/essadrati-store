import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { reorderInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../../lib/revalidate";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { HERO_SLIDES_MODULE } from "../../../../modules/hero-slides";
import type HeroSlidesModuleService from "../../../../modules/hero-slides/service";

/** POST /admin/hero-slides/reorder { ids }: every slide id, first shown first. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = reorderInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  const slides = await service.reorderSlides(parsed.data.ids);
  await revalidateStorefront(
    [CACHE_TAGS.heroSlides],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ slides });
}
