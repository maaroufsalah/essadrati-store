import type { SmtpSettings } from "@nocido/types";
import nodemailer, { type Transporter } from "nodemailer";

export class SmtpNotConfiguredError extends Error {
  constructor() {
    super("smtp.notConfigured");
    this.name = "SmtpNotConfiguredError";
  }
}

/** Nodemailer transport built from StoreSettings.smtp and the decrypted password. */
export function createSmtpTransport(smtp: SmtpSettings, password: string | null): Transporter {
  if (!smtp.host || !smtp.fromEmail) throw new SmtpNotConfiguredError();
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: password ?? "" } : undefined,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
  });
}

/** "Store <orders@example.ma>", or the bare address without a name. */
export function fromAddress(smtp: SmtpSettings): string {
  return smtp.fromName
    ? `"${smtp.fromName.replace(/"/g, "'")}" <${smtp.fromEmail}>`
    : smtp.fromEmail;
}
