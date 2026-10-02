import { model } from "@medusajs/framework/utils";

/**
 * Permanent redirect of a storefront path (without the locale), e.g.
 * /p/old-handle -> /p/new-handle. Recorded when a product or category
 * handle changes in the admin, or added by hand.
 */
const Redirect = model.define("redirect", {
  id: model.id({ prefix: "redir" }).primaryKey(),
  from_path: model.text().unique(),
  to_path: model.text(),
});

export default Redirect;
