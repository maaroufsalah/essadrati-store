import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { MOROCCAN_CITIES_MODULE } from "../../../modules/moroccan-cities";
import type MoroccanCitiesModuleService from "../../../modules/moroccan-cities/service";

/** GET /store/cities: active COD cities with their fee and delivery delay. */
export async function GET(req: MedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const cities = await service.listResolvedCities({ activeOnly: true });
  res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=600");
  res.json({
    cities: cities.map((city) => ({
      id: city.id,
      slug: city.slug,
      name: city.name,
      zone: city.zone.code,
      fee: city.fee,
      delivery_days_min: city.deliveryDaysMin,
      delivery_days_max: city.deliveryDaysMax,
    })),
  });
}
