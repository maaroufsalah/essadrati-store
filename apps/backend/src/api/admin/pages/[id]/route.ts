import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { pageInputSchema } from "@nocido/types";
import { recordRedirect } from "../../../../lib/handle-redirects";
import { revalidateStorefront } from "../../../../lib/revalidate";
import { routeParam, sendInvalid, zodIssues } from "../../../../lib/validation";
import { PAGES_MODULE } from "../../../../modules/pages";
import type PagesModuleService from "../../../../modules/pages/service";

/** GET /admin/pages/:id */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  res.json({ page: await service.getPage(routeParam(req, "id")) });
}

/** POST /admin/pages/:id (full replacement of the editable fields) */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = pageInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  const id = routeParam(req, "id");
  const previous = await service.getPage(id);
  const page = await service.savePage(parsed.data, id);
  if (previous.handle !== page.handle) {
    await recordRedirect(req.scope, `/${previous.handle}`, `/${page.handle}`);
  }
  await revalidateStorefront(
    [CACHE_TAGS.pages],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ page });
}

/** DELETE /admin/pages/:id */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  const id = routeParam(req, "id");
  await service.deleteCmsPages(id);
  await revalidateStorefront(
    [CACHE_TAGS.pages],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ id, deleted: true });
}
