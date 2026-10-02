import { MedusaError, MedusaService } from "@medusajs/framework/utils";
import { activeByRank, type CategoryBanner, type CategoryBannerInput } from "@nocido/types";
import { rankUpdates } from "../../lib/reorder";
import { type CategoryBannerRecord, toCategoryBanner, toCategoryBannerData } from "./lib";
import CategoryBannerModel from "./models/category-banner";

export default class CategoryBannersModuleService extends MedusaService({
  CategoryBanner: CategoryBannerModel,
}) {
  /** Every banner by rank (admin), or only the active ones (storefront). */
  async listBanners(filters: { activeOnly?: boolean } = {}): Promise<CategoryBanner[]> {
    const records = (await this.listCategoryBanners(filters.activeOnly ? { active: true } : {}, {
      take: null,
      order: { rank: "ASC", created_at: "ASC" },
    })) as unknown as CategoryBannerRecord[];
    const banners = records.map(toCategoryBanner);
    return filters.activeOnly ? activeByRank(banners) : banners;
  }

  async getBanner(id: string): Promise<CategoryBanner> {
    const record = (await this.retrieveCategoryBanner(id)) as unknown as CategoryBannerRecord;
    return toCategoryBanner(record);
  }

  /** Creates (no id) or replaces the editable fields of a banner. */
  async saveBanner(input: CategoryBannerInput, id?: string): Promise<CategoryBanner> {
    if (id) {
      await this.retrieveCategoryBanner(id);
      await this.updateCategoryBanners({ id, ...toCategoryBannerData(input) });
      return this.getBanner(id);
    }
    const created = await this.createCategoryBanners(toCategoryBannerData(input));
    return this.getBanner(created.id);
  }

  /** `ids` must list every banner exactly once; ranks become 0, 1, 2... */
  async reorderBanners(ids: string[]): Promise<CategoryBanner[]> {
    const existing = await this.listCategoryBanners({}, { take: null, select: ["id"] });
    const updates = rankUpdates(
      existing.map((banner) => banner.id),
      ids,
    );
    if (!updates) throw new MedusaError(MedusaError.Types.INVALID_DATA, "reorder.mismatch");
    if (updates.length > 0) await this.updateCategoryBanners(updates);
    return this.listBanners();
  }
}
