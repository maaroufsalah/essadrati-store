import { MedusaError, MedusaService } from "@medusajs/framework/utils";
import {
  type CityCsvRow,
  type CityRecord,
  type ResolvedCity,
  resolveCity,
  rowName,
} from "./lib/cities";
import City from "./models/city";
import Zone from "./models/zone";

export interface CityImportResult {
  created: number;
  updated: number;
  /** Rows whose zone_code matches no zone. */
  skipped: { slug: string; code: string }[];
}

export default class MoroccanCitiesModuleService extends MedusaService({ Zone, City }) {
  /** Every city with zone values applied, sorted by rank then French name. */
  async listResolvedCities(filters: { activeOnly?: boolean } = {}): Promise<ResolvedCity[]> {
    const cities = (await this.listCities(filters.activeOnly ? { is_active: true } : {}, {
      relations: ["zone"],
      take: null,
    })) as unknown as CityRecord[];
    return cities
      .map(resolveCity)
      .filter((city): city is ResolvedCity => city !== null)
      .sort(
        (a, b) => a.rank - b.rank || (a.name.fr ?? a.slug).localeCompare(b.name.fr ?? b.slug, "fr"),
      );
  }

  /** One active city, or a NOT_FOUND error (the COD form only offers active cities). */
  async getActiveCity(id: string): Promise<ResolvedCity> {
    const [city] = (await this.listCities(
      { id, is_active: true },
      { relations: ["zone"], take: 1 },
    )) as unknown as CityRecord[];
    const resolved = city ? resolveCity(city) : null;
    if (!resolved) throw new MedusaError(MedusaError.Types.NOT_FOUND, "city.notFound");
    return resolved;
  }

  /** Upserts cities by slug. Unknown zone codes are reported, not created. */
  async importCities(rows: CityCsvRow[]): Promise<CityImportResult> {
    const zones = await this.listZones({}, { take: null });
    const zoneByCode = new Map(zones.map((zone) => [zone.code, zone.id]));
    const existing = await this.listCities({ slug: rows.map((row) => row.slug) }, { take: null });
    const idBySlug = new Map(existing.map((city) => [city.slug, city.id]));

    const result: CityImportResult = { created: 0, updated: 0, skipped: [] };
    const toCreate = [];
    const toUpdate = [];
    for (const row of rows) {
      const zoneId = zoneByCode.get(row.zone_code);
      if (!zoneId) {
        result.skipped.push({ slug: row.slug, code: row.zone_code });
        continue;
      }
      const data = {
        slug: row.slug,
        name: rowName(row),
        fee: row.fee,
        delivery_days_min: row.days_min,
        delivery_days_max: row.days_max,
        is_active: row.active,
        zone_id: zoneId,
      };
      const id = idBySlug.get(row.slug);
      if (id) toUpdate.push({ id, ...data });
      // New cities go after the seeded ones until an admin reorders them.
      else toCreate.push({ ...data, rank: 100 });
    }
    if (toCreate.length > 0) await this.createCities(toCreate);
    if (toUpdate.length > 0) await this.updateCities(toUpdate);
    result.created = toCreate.length;
    result.updated = toUpdate.length;
    return result;
  }
}
