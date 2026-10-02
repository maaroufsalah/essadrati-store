/**
 * Seeds COD delivery zones and the main Moroccan cities from
 * data/moroccan-cities.json. Idempotent: zones and cities are upserted by
 * code and slug; fees edited in the admin are kept for existing rows.
 *
 *   pnpm --filter @nocido/backend cities:seed
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import type { ExecArgs } from "@medusajs/framework/types";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { localizedStringSchema } from "@nocido/types";
import { z } from "zod";
import { MOROCCAN_CITIES_MODULE } from "../modules/moroccan-cities";
import type MoroccanCitiesModuleService from "../modules/moroccan-cities/service";

const seedSchema = z.object({
  zones: z.array(
    z.object({
      code: z.string(),
      name: localizedStringSchema,
      fee: z.number().min(0),
      delivery_days_min: z.number().int().min(0),
      delivery_days_max: z.number().int().min(0),
    }),
  ),
  cities: z.array(
    z.object({
      slug: z.string(),
      zone: z.string(),
      rank: z.number().int(),
      name: localizedStringSchema,
    }),
  ),
});

export async function seedCities(container: ExecArgs["container"]): Promise<void> {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER);
  const service = container.resolve<MoroccanCitiesModuleService>(MOROCCAN_CITIES_MODULE);
  const file = path.join(process.cwd(), "data", "moroccan-cities.json");
  const seed = seedSchema.parse(JSON.parse(readFileSync(file, "utf8")));

  const existingZones = await service.listZones({}, { take: null });
  const zoneId = new Map(existingZones.map((zone) => [zone.code, zone.id]));
  const newZones = seed.zones.filter((zone) => !zoneId.has(zone.code));
  if (newZones.length > 0) {
    const created = await service.createZones(newZones);
    for (const zone of created) zoneId.set(zone.code, zone.id);
  }

  const existingCities = await service.listCities({}, { take: null });
  const known = new Set(existingCities.map((city) => city.slug));
  const newCities = seed.cities
    .filter((city) => !known.has(city.slug))
    .map((city) => {
      const zone = zoneId.get(city.zone);
      if (!zone) throw new Error(`Unknown zone ${city.zone} for ${city.slug}`);
      return { slug: city.slug, name: city.name, rank: city.rank, zone_id: zone };
    });
  if (newCities.length > 0) await service.createCities(newCities);

  logger.info(`Cities: ${newZones.length} zones and ${newCities.length} cities created`);
}

export default async function seedCitiesScript({ container }: ExecArgs): Promise<void> {
  await seedCities(container);
}
