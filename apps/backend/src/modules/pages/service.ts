import { MedusaError, MedusaService } from "@medusajs/framework/utils";
import type { Page, PageInput, PageSummary } from "@nocido/types";
import { type CmsPageRecord, toPage, toRecordData } from "./lib";
import CmsPage from "./models/cms-page";

export default class PagesModuleService extends MedusaService({ CmsPage }) {
  async listPages(filters: { publishedOnly?: boolean } = {}): Promise<Page[]> {
    const records = (await this.listCmsPages(filters.publishedOnly ? { status: "published" } : {}, {
      take: null,
      order: { footer_rank: "ASC", handle: "ASC" },
    })) as unknown as CmsPageRecord[];
    return records.map(toPage);
  }

  async listPublishedSummaries(): Promise<PageSummary[]> {
    const pages = await this.listPages({ publishedOnly: true });
    return pages.map(({ id, handle, title, showInFooter, footerRank, updatedAt }) => ({
      id,
      handle,
      title,
      showInFooter,
      footerRank,
      updatedAt,
    }));
  }

  async getPublishedPage(handle: string): Promise<Page> {
    const [record] = (await this.listCmsPages(
      { handle, status: "published" },
      { take: 1 },
    )) as unknown as CmsPageRecord[];
    if (!record) throw new MedusaError(MedusaError.Types.NOT_FOUND, "page.notFound");
    return toPage(record);
  }

  async getPage(id: string): Promise<Page> {
    const record = (await this.retrieveCmsPage(id)) as unknown as CmsPageRecord;
    return toPage(record);
  }

  /** Creates (no id) or updates a page. A duplicate handle is a 400. */
  async savePage(input: PageInput, id?: string): Promise<Page> {
    const [sameHandle] = await this.listCmsPages({ handle: input.handle }, { take: 1 });
    if (sameHandle && sameHandle.id !== id) {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "page.handle.taken");
    }
    if (id) {
      const current = (await this.retrieveCmsPage(id)) as unknown as CmsPageRecord;
      await this.updateCmsPages({ id, ...toRecordData(input, current) });
      return this.getPage(id);
    }
    const created = await this.createCmsPages(toRecordData(input, null));
    return this.getPage(created.id);
  }
}
