import { MedusaError, MedusaService } from "@medusajs/framework/utils";
import { activeByRank, type HeroSlide, type HeroSlideInput } from "@nocido/types";
import { rankUpdates } from "../../lib/reorder";
import { type HeroSlideRecord, toHeroSlide, toHeroSlideData } from "./lib";
import HeroSlideModel from "./models/hero-slide";

export default class HeroSlidesModuleService extends MedusaService({ HeroSlide: HeroSlideModel }) {
  /** Every slide by rank (admin), or only the active ones (storefront). */
  async listSlides(filters: { activeOnly?: boolean } = {}): Promise<HeroSlide[]> {
    const records = (await this.listHeroSlides(filters.activeOnly ? { active: true } : {}, {
      take: null,
      order: { rank: "ASC", created_at: "ASC" },
    })) as unknown as HeroSlideRecord[];
    const slides = records.map(toHeroSlide);
    return filters.activeOnly ? activeByRank(slides) : slides;
  }

  async getSlide(id: string): Promise<HeroSlide> {
    const record = (await this.retrieveHeroSlide(id)) as unknown as HeroSlideRecord;
    return toHeroSlide(record);
  }

  /** Creates (no id) or replaces the editable fields of a slide. */
  async saveSlide(input: HeroSlideInput, id?: string): Promise<HeroSlide> {
    if (id) {
      await this.retrieveHeroSlide(id);
      await this.updateHeroSlides({ id, ...toHeroSlideData(input) });
      return this.getSlide(id);
    }
    const created = await this.createHeroSlides(toHeroSlideData(input));
    return this.getSlide(created.id);
  }

  /** `ids` must list every slide exactly once; ranks become 0, 1, 2... */
  async reorderSlides(ids: string[]): Promise<HeroSlide[]> {
    const existing = await this.listHeroSlides({}, { take: null, select: ["id"] });
    const updates = rankUpdates(
      existing.map((slide) => slide.id),
      ids,
    );
    if (!updates) throw new MedusaError(MedusaError.Types.INVALID_DATA, "reorder.mismatch");
    if (updates.length > 0) await this.updateHeroSlides(updates);
    return this.listSlides();
  }
}
