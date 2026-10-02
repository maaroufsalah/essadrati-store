import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { heroSlideInputSchema } from "@nocido/types";
import { releaseMedia } from "../../../../lib/media-cleanup";
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
  const id = routeParam(req, "id");
  const previous = await service.getSlide(id);
  const slide = await service.saveSlide(parsed.data, id);
  await revalidateStorefront(
    [CACHE_TAGS.heroSlides],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  // Replaced images are deleted from the File Module unless used elsewhere,
  // after the revalidation so no fresh page points to them.
  await releaseMedia(
    req.scope,
    [previous.imageDesktop, previous.imageMobile],
    [slide.imageDesktop, slide.imageMobile],
  );
  res.json({ slide });
}

/** DELETE /admin/hero-slides/:id */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  const id = routeParam(req, "id");
  const previous = await service.getSlide(id);
  await service.deleteHeroSlides(id);
  await revalidateStorefront(
    [CACHE_TAGS.heroSlides],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  await releaseMedia(req.scope, [previous.imageDesktop, previous.imageMobile], []);
  res.json({ id, deleted: true });
}
