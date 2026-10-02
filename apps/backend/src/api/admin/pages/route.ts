import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { pageInputSchema } from "@nocido/types";
import { revalidateStorefront } from "../../../lib/revalidate";
import { sendInvalid, zodIssues } from "../../../lib/validation";
import { PAGES_MODULE } from "../../../modules/pages";
import type PagesModuleService from "../../../modules/pages/service";

/** GET /admin/pages: every page, drafts included. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  res.json({ pages: await service.listPages() });
}

/** POST /admin/pages */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = pageInputSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const service = req.scope.resolve<PagesModuleService>(PAGES_MODULE);
  const page = await service.savePage(parsed.data);
  await revalidateStorefront(
    [CACHE_TAGS.pages],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.status(201).json({ page });
}
