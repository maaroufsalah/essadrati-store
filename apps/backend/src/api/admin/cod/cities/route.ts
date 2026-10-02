import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { cityBodySchema } from "../../../../lib/cod-schemas";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { MOROCCAN_CITIES_MODULE } from "../../../../modules/moroccan-cities";
import type MoroccanCitiesModuleService from "../../../../modules/moroccan-cities/service";

/** GET /admin/cod/cities: every city, raw values plus the resolved fee and delay. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const [cities, resolved] = await Promise.all([
    service.listCities({}, { take: null, relations: ["zone"] }),
    service.listResolvedCities(),
  ]);
  const byId = new Map(resolved.map((city) => [city.id, city]));
  res.json({
    cities: cities
      .map((city) => ({ ...city, resolved: byId.get(city.id) ?? null }))
      .sort((a, b) => a.rank - b.rank || a.slug.localeCompare(b.slug)),
  });
}

/** POST /admin/cod/cities */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = cityBodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const city = await service.createCities(parsed.data);
  res.status(201).json({ city });
}
