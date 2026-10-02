import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { heroSlideInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../lib/revalidate";
import { sendInvalid, zodIssues } from "../../../lib/validation";
import { HERO_SLIDES_MODULE } from "../../../modules/hero-slides";
import type HeroSlidesModuleService from "../../../modules/hero-slides/service";

/** GET /admin/hero-slides: every slide by rank, inactive ones included. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  res.json({ slides: await service.listSlides() });
}

/** POST /admin/hero-slides */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = heroSlideInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  const slide = await service.saveSlide(parsed.data);
  await revalidateStorefront(
    [CACHE_TAGS.heroSlides],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.status(201).json({ slide });
}
