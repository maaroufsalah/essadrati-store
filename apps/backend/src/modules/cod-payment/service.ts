import type {
  AuthorizePaymentInput,
  AuthorizePaymentOutput,
  CancelPaymentInput,
  CancelPaymentOutput,
  CapturePaymentInput,
  CapturePaymentOutput,
  DeletePaymentInput,
  DeletePaymentOutput,
  GetPaymentStatusInput,
  GetPaymentStatusOutput,
  InitiatePaymentInput,
  InitiatePaymentOutput,
  ProviderWebhookPayload,
  RefundPaymentInput,
  RefundPaymentOutput,
  RetrievePaymentInput,
  RetrievePaymentOutput,
  UpdatePaymentInput,
  UpdatePaymentOutput,
  WebhookActionResult,
} from "@medusajs/framework/types";
import { AbstractPaymentProvider, PaymentActions } from "@medusajs/framework/utils";

/**
 * Cash on delivery. Nothing leaves the backend:
 * - authorize: the customer committed to pay on delivery, the order is created;
 * - capture: the courier collected the cash (admin "Capture payment");
 * - cancel / refund: bookkeeping only.
 * The phone confirmation (pending -> confirmed / cancelled) lives on the
 * order metadata, handled by the confirm-cod workflow.
 * Provider id: pp_cod_cod.
 */
export default class CodPaymentProviderService extends AbstractPaymentProvider {
  static override identifier = "cod";

  // AbstractPaymentProvider's constructor is protected; ModuleProvider needs a public one.
  constructor(cradle: Record<string, unknown>, config: Record<string, unknown> = {}) {
    super(cradle, config);
  }

  initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
    return Promise.resolve({
      id: `cod_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
      data: { method: "cod", amount: input.amount, currency_code: input.currency_code },
    });
  }

  authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
    return Promise.resolve({
      status: "authorized",
      data: { ...input.data, authorized_at: new Date().toISOString() },
    });
  }

  capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
    return Promise.resolve({ data: { ...input.data, captured_at: new Date().toISOString() } });
  }

  cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
    return Promise.resolve({ data: { ...input.data, cancelled_at: new Date().toISOString() } });
  }

  deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
    return Promise.resolve({ data: input.data });
  }

  getPaymentStatus(_input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
    return Promise.resolve({ status: "authorized" });
  }

  refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    return Promise.resolve({ data: { ...input.data, refunded_at: new Date().toISOString() } });
  }

  retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
    return Promise.resolve({ data: input.data });
  }

  updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
    return Promise.resolve({
      data: { ...input.data, amount: input.amount, currency_code: input.currency_code },
    });
  }

  getWebhookActionAndData(
    _payload: ProviderWebhookPayload["payload"],
  ): Promise<WebhookActionResult> {
    return Promise.resolve({ action: PaymentActions.NOT_SUPPORTED });
  }
}
