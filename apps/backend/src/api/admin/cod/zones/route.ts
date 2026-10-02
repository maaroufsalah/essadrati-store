import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { zoneBodySchema } from "../../../../lib/cod-schemas";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { MOROCCAN_CITIES_MODULE } from "../../../../modules/moroccan-cities";
import type MoroccanCitiesModuleService from "../../../../modules/moroccan-cities/service";

/** GET /admin/cod/zones */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const zones = await service.listZones({}, { take: null, order: { fee: "ASC" } });
  res.json({ zones });
}

/** POST /admin/cod/zones */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = zoneBodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const zone = await service.createZones(parsed.data);
  res.status(201).json({ zone });
}
