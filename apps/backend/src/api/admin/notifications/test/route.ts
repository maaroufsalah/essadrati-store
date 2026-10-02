import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { z } from "zod";
import { createSmtpTransport, fromAddress, SmtpNotConfiguredError } from "../../../../lib/mailer";
import { sendInvalid, zodIssues } from "../../../../lib/validation";
import { STORE_SETTINGS_MODULE } from "../../../../modules/store-settings";
import type StoreSettingsModuleService from "../../../../modules/store-settings/service";
import { renderSample, sampleSchema } from "../../../../lib/notifications/sample";

const bodySchema = sampleSchema.extend({ to: z.email("email.invalid") });

/** POST /admin/notifications/test { to, kind, locale }: sends the sample email through SMTP. */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, zodIssues(parsed.error));
  const message = await renderSample(req, parsed.data.kind, parsed.data.locale);
  if (!message) {
    res.status(404).json({ type: "not_found", message: "notifications.noOrder" });
    return;
  }
  const service = req.scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  const settings = await service.getSettings();
  try {
    const transport = createSmtpTransport(settings.smtp, await service.getSmtpPassword());
    await transport.sendMail({
      from: fromAddress(settings.smtp),
      to: parsed.data.to,
      subject: message.subject,
      html: message.html,
    });
    res.json({ sent: true });
  } catch (error) {
    const code = error instanceof SmtpNotConfiguredError ? error.message : "smtp.failed";
    res.status(400).json({
      type: "invalid_data",
      message: error instanceof Error ? error.message : String(error),
      issues: [{ path: "smtp", code }],
    });
  }
}
