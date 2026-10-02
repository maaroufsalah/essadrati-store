import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { cityBodySchema } from "../../../../../lib/cod-schemas";
import { routeParam, sendInvalid, zodIssues } from "../../../../../lib/validation";
import { MOROCCAN_CITIES_MODULE } from "../../../../../modules/moroccan-cities";
import type MoroccanCitiesModuleService from "../../../../../modules/moroccan-cities/service";

/** POST /admin/cod/cities/:id (partial update) */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = cityBodySchema.partial().safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const city = await service.updateCities({ id: routeParam(req, "id"), ...parsed.data });
  res.json({ city });
}

/** DELETE /admin/cod/cities/:id */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  await service.deleteCities(routeParam(req, "id"));
  res.json({ id: routeParam(req, "id"), deleted: true });
}
