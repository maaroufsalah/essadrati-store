import type { MedusaResponse } from "@medusajs/framework/http";
import type { RenderedDocument } from ".";
import { PdfRendererUnavailableError } from "./renderer";

/** Sends a PDF inline (preview) or as a download. */
export function sendPdf(res: MedusaResponse, document: RenderedDocument, download: boolean): void {
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `${download ? "attachment" : "inline"}; filename="${document.filename}"`,
  );
  res.setHeader("Cache-Control", "no-store");
  res.send(document.pdf);
}

/** 503 with an i18n code when no browser can render PDFs on this server. */
export function sendRendererError(res: MedusaResponse, error: unknown): boolean {
  if (!(error instanceof PdfRendererUnavailableError)) return false;
  res.status(503).json({ type: "unexpected_state", message: error.message });
  return true;
}
