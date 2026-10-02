import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { zoneBodySchema } from "../../../../../lib/cod-schemas";
import { routeParam, sendInvalid, zodIssues } from "../../../../../lib/validation";
import { MOROCCAN_CITIES_MODULE } from "../../../../../modules/moroccan-cities";
import type MoroccanCitiesModuleService from "../../../../../modules/moroccan-cities/service";

/** POST /admin/cod/zones/:id (partial update) */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = zoneBodySchema.partial().safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const zone = await service.updateZones({ id: routeParam(req, "id"), ...parsed.data });
  res.json({ zone });
}

/** DELETE /admin/cod/zones/:id (refused while cities use it) */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const id = routeParam(req, "id");
  const cities = await service.listCities({ zone_id: id }, { take: 1 });
  if (cities.length > 0) return sendInvalid(res, [{ path: "zone", code: "zone.inUse" }]);
  await service.deleteZones(id);
  res.json({ id, deleted: true });
}
