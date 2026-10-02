import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { IProductModuleService } from "@medusajs/framework/types";
import { Modules } from "@medusajs/framework/utils";

/**
 * GET /admin/catalog/options: distinct product option titles (weight,
 * size...), offered as facets in admin › Catalogue.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const products = req.scope.resolve<IProductModuleService>(Modules.PRODUCT);
  const options = await products.listProductOptions({}, { select: ["title"], take: null });
  const titles = [...new Set(options.map((option) => option.title.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
  res.json({ options: titles });
}
