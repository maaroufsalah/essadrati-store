import type { Logger } from "@medusajs/framework/types";

export interface WhatsAppMessage {
  /** E.164 phone number. */
  to: string;
  text: string;
}

/** WhatsApp sending channel. A real provider (WhatsApp Cloud API…) implements it later. */
export interface WhatsAppChannel {
  readonly name: string;
  send(message: WhatsAppMessage, logger: Logger): Promise<void>;
}

/** Stub: logs what would be sent, with the number masked. */
export const logWhatsAppChannel: WhatsAppChannel = {
  name: "log",
  send(message, logger) {
    const masked = message.to.replace(/\d(?=\d{2})/g, "•");
    logger.info(`[whatsapp:stub] to ${masked}: ${message.text.replace(/\n/g, " | ")}`);
    return Promise.resolve();
  },
};

/** Channel selected by WHATSAPP_PROVIDER (only "log" exists for now). */
export function whatsappChannel(): WhatsAppChannel {
  return logWhatsAppChannel;
}
