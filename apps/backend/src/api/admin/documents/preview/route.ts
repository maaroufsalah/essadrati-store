import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  DOCUMENT_TYPES,
  type DocumentType,
  latestCodOrderId,
  renderOrderDocument,
} from "../../../../lib/documents";
import { sendPdf, sendRendererError } from "../../../../lib/documents/http";

const isDocumentType = (value: unknown): value is DocumentType =>
  DOCUMENT_TYPES.includes(value as DocumentType);

/** GET /admin/documents/preview?type=invoice: the document of the latest COD order, inline. */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const type = req.query.type ?? "invoice";
  if (!isDocumentType(type)) {
    res.status(404).json({ type: "not_found", message: "document.notFound" });
    return;
  }
  const orderId = await latestCodOrderId(req.scope);
  try {
    const document = orderId ? await renderOrderDocument(req.scope, orderId, type) : null;
    if (!document) {
      res.status(404).json({ type: "not_found", message: "notifications.noOrder" });
      return;
    }
    sendPdf(res, document, false);
  } catch (error) {
    if (!sendRendererError(res, error)) throw error;
  }
}
