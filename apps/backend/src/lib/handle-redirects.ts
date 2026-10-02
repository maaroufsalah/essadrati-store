import type { MedusaNextFunction, MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import type { IProductModuleService, Logger } from "@medusajs/framework/types";
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { REDIRECTS_MODULE } from "../modules/redirects";
import type RedirectsModuleService from "../modules/redirects/service";
import { revalidateStorefront } from "./revalidate";

/** Records `from -> to` and asks the storefront to reload its redirect map. Never throws. */
export async function recordRedirect(
  scope: MedusaRequest["scope"],
  from: string,
  to: string,
): Promise<void> {
  const logger = scope.resolve<Logger>(ContainerRegistrationKeys.LOGGER);
  try {
    await scope.resolve<RedirectsModuleService>(REDIRECTS_MODULE).addRedirect(from, to);
    logger.info(`[redirects] ${from} -> ${to}`);
    await revalidateStorefront([CACHE_TAGS.redirects], logger);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.warn(`[redirects] not recorded (${from} -> ${to}): ${message}`);
  }
}

type Kind = "product" | "category";

/**
 * Admin middleware for POST /admin/products/:id and
 * /admin/product-categories/:id: when the request renames the handle and
 * succeeds, the old storefront URL is redirected (301) to the new one.
 */
export function captureHandleChange(kind: Kind) {
  return async (
    req: MedusaRequest,
    res: MedusaResponse,
    next: MedusaNextFunction,
  ): Promise<void> => {
    const body = req.body as { handle?: unknown } | undefined;
    const id = req.params.id;
    const nextHandle = typeof body?.handle === "string" ? body.handle.trim() : "";
    if (!id || !nextHandle) return next();
    let previous: string | null = null;
    try {
      const products = req.scope.resolve<IProductModuleService>(Modules.PRODUCT);
      previous =
        kind === "product"
          ? (await products.retrieveProduct(id, { select: ["handle"] })).handle
          : (await products.retrieveProductCategory(id, { select: ["handle"] })).handle;
    } catch {
      previous = null;
    }
    if (previous && previous !== nextHandle) {
      const segment = kind === "product" ? "p" : "c";
      const from = `/${segment}/${previous}`;
      const to = `/${segment}/${nextHandle}`;
      res.on("finish", () => {
        if (res.statusCode < 400) void recordRedirect(req.scope, from, to);
      });
    }
    return next();
  };
}
