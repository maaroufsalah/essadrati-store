import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { renderSample, sampleSchema } from "../../../../lib/notifications/sample";

/** GET /admin/notifications/preview?kind=placed&locale=fr: subject and HTML of a sample email. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = sampleSchema.safeParse(req.query);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const message = await renderSample(req, parsed.data.kind, parsed.data.locale);
  if (!message) {
    res.status(404).json({ type: "not_found", message: "notifications.noOrder" });
    return;
  }
  res.json({ subject: message.subject, html: message.html });
}
