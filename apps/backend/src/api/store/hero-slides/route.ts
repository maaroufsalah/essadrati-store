import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { HERO_SLIDES_MODULE } from "../../../modules/hero-slides";
import type HeroSlidesModuleService from "../../../modules/hero-slides/service";

/** GET /store/hero-slides: active slides by rank. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<HeroSlidesModuleService>(HERO_SLIDES_MODULE);
  res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=300");
  res.json({ slides: await service.listSlides({ activeOnly: true }) });
}
