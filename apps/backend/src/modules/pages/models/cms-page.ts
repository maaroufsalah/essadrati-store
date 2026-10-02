import { model } from "@medusajs/framework/utils";

/**
 * CMS page (our story, FAQ, delivery...). Localized title, Markdown content
 * and SEO are JSON records validated with @nocido/types.
 */
const CmsPage = model.define("cms_page", {
  id: model.id({ prefix: "page" }).primaryKey(),
  handle: model.text().unique(),
  title: model.json(),
  content: model.json(),
  seo: model.json(),
  status: model.enum(["draft", "published"]).default("draft"),
  show_in_footer: model.boolean().default(false),
  footer_rank: model.number().default(0),
  published_at: model.dateTime().nullable(),
});

export default CmsPage;
