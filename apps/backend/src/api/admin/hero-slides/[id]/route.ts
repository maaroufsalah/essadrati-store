import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { heroSlideInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../../lib/revalidate";
import { routeParam, sendInvalid, zodIssues } from "../../../../lib/validation";
import { HERO_SLIDES_MODULE } from "../../../../modules/hero-slides";
import type HeroSlidesModuleService from "../../../../modules/hero-slides/service";

/** GET /admin/hero-slides/:id */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  res.json({ slide: await service.getSlide(routeParam(req, "id")) });
}

/** POST /admin/hero-slides/:id (full replacement of the editable fields) */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = heroSlideInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  const slide = await service.saveSlide(parsed.data, routeParam(req, "id"));
  await revalidateStorefront(
    [CACHE_TAGS.heroSlides],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ slide });
}

/** DELETE /admin/hero-slides/:id */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  const id = routeParam(req, "id");
  await service.deleteHeroSlides(id);
  await revalidateStorefront(
    [CACHE_TAGS.heroSlides],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ id, deleted: true });
}
