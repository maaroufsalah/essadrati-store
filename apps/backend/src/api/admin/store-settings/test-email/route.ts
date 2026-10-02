import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { resolveLocalized } from "@nocido/types";
import { z } from "zod";
import { createSmtpTransport, fromAddress, SmtpNotConfiguredError } from "../../../../lib/mailer";
import { sendInvalid } from "../../../../lib/validation";
import { STORE_SETTINGS_MODULE } from "../../../../modules/store-settings";
import type StoreSettingsModuleService from "../../../../modules/store-settings/service";

const bodySchema = z.object({ to: z.email() });

/**
 * POST /admin/store-settings/test-email: sends a short message with the saved
 * SMTP settings. 400 with the transport error when the server refuses it.
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const parsed = bodySchema.safeParse(req.body);
  if (!parsed.success) return sendInvalid(res, [{ path: "to", code: "email.invalid" }]);

  const service = req.scope.resolve<StoreSettingsModuleService>(STORE_SETTINGS_MODULE);
  const settings = await service.getSettings();
  const storeName = resolveLocalized(
    settings.identity.storeName,
    settings.localization.defaultLocale,
  );

  try {
    const transport = createSmtpTransport(settings.smtp, await service.getSmtpPassword());
    await transport.sendMail({
      from: fromAddress(settings.smtp),
      to: parsed.data.to,
      subject: `${storeName} · SMTP`,
      text: `${storeName}: SMTP OK (${new Date().toISOString()})`,
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
