import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { storeSettingsUpdateSchema } from "@nocido/types";
import { contrastIssues, isZodError, sendInvalid, zodIssues } from "../../../lib/validation";
import { STORE_SETTINGS_MODULE } from "../../../modules/store-settings";
import { applyUpdate, ThemeContrastError } from "../../../modules/store-settings/lib/settings";
import type StoreSettingsModuleService from "../../../modules/store-settings/service";
import { updateStoreSettingsWorkflow } from "../../../workflows/update-store-settings";

/** GET /admin/store-settings: full settings, SMTP password excluded. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const service = req.scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  res.json({ settings: await service.getSettings() });
}

/**
 * POST /admin/store-settings: partial update, one or more sections.
 * 400 with `issues` when the payload, the merged result or the theme
 * contrast is invalid.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = storeSettingsUpdateSchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));

  // Dry run on the current settings, so validation errors become a 400
  // instead of a failed workflow. The workflow merges again before saving.
  const service = req.scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  try {
    applyUpdate(await service.getSettings(), parsed.data);
  } catch (error) {
    if (isZodError(error)) return sendInvalid(res, zodIssues(error));
    if (error instanceof ThemeContrastError) return sendInvalid(res, contrastIssues(error.issues));
    throw error;
  }

  const { result } = await updateStoreSettingsWorkflow(req.scope).run({
    input: { patch: parsed.data },
  });
  res.json({ settings: result });
}
