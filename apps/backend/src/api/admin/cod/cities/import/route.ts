import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { cityImportBodySchema } from "../../../../../lib/cod-schemas";
import { sendInvalid, zodIssues } from "../../../../../lib/validation";
import { MOROCCAN_CITIES_MODULE } from "../../../../../modules/moroccan-cities";
import { parseCityCsv } from "../../../../../modules/moroccan-cities/lib/cities";
import type MoroccanCitiesModuleService from "../../../../../modules/moroccan-cities/service";

/**
 * POST /admin/cod/cities/import { csv }: upserts cities by slug.
 * Columns: slug, name_ar, name_fr, name_en, zone_code, fee, days_min, days_max, active.
 * Invalid lines are reported and skipped; valid lines are imported.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = cityImportBodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));

  const { rows, errors } = parseCityCsv(parsed.data.csv);
  if (rows.length === 0) {
    return sendInvalid(
      res,
      errors.map((error) => ({ path: `line.${error.line}`, code: error.code })),
    );
  }
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const result = await service.importCities(rows);
  res.json({ ...result, errors });
}
