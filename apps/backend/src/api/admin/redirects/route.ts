import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { CACHE_TAGS } from "@nocido/api-client";
import { revalidateStorefront } from "../../../lib/revalidate";
import { sendInvalid } from "../../../lib/validation";
import { REDIRECTS_MODULE } from "../../../modules/redirects";
import { isRedirectPath } from "../../../modules/redirects/lib";
import type RedirectsModuleService from "../../../modules/redirects/service";

const service = (req: AuthenticatedMedusaRequest) =>
  req.scope.resolve<RedirectsModuleService>(REDIRECTS_MODULE);

/** GET /admin/redirects: every permanent redirect of the storefront. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  res.json({ redirects: await service(req).listRows() });
}

/** POST /admin/redirects { from, to }: adds one (chains are collapsed). */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const body = (req.body ?? {}) as { from?: unknown; to?: unknown };
  const from = typeof body.from === "string" ? body.from.trim() : "";
  const to = typeof body.to === "string" ? body.to.trim() : "";
  const issues = [
    ...(isRedirectPath(from) ? [] : [{ path: "from", code: "redirect.path" }]),
    ...(isRedirectPath(to) ? [] : [{ path: "to", code: "redirect.path" }]),
  ];
  if (issues.length > 0) return sendInvalid(res, issues);
  const redirects = await service(req).addRedirect(from, to);
  await revalidateStorefront(
    [CACHE_TAGS.redirects],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.status(201).json({ redirects });
}

/** DELETE /admin/redirects?from=/p/old */
export async function DELETE(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const from = typeof req.query.from === "string" ? req.query.from : "";
  const redirects = await service(req).removeRedirect(from);
  await revalidateStorefront(
    [CACHE_TAGS.redirects],
    req.scope.resolve(ContainerRegistrationKeys.LOGGER),
  );
  res.json({ redirects });
}
