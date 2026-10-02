import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  DOCUMENT_TYPES,
  type DocumentType,
  renderOrderDocument,
} from "../../../../../../../lib/documents";
import { sendPdf, sendRendererError } from "../../../../../../../lib/documents/http";

const isDocumentType = (value: unknown): value is DocumentType =>
  DOCUMENT_TYPES.includes(value as DocumentType);

/**
 * GET /admin/cod/orders/:id/documents/:type (invoice | delivery-note):
 * PDF download. `?inline=1` displays it instead.
 */
export async function GET(req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
  const type = req.params.type;
  if (!isDocumentType(type)) {
    res.status(404).json({ type: "not_found", message: "document.notFound" });
    return;
  }
  try {
    const document = await renderOrderDocument(req.scope, req.params.id ?? "", type);
    if (!document) {
      res.status(404).json({ type: "not_found", message: "cod.orderNotFound" });
      return;
    }
    sendPdf(res, document, req.query.inline !== "1");
  } catch (error) {
    if (!sendRendererError(res, error)) throw error;
  }
}
