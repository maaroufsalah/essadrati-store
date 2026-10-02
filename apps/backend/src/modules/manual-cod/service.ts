import type {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  FulfillmentOption,
} from "@medusajs/framework/types";
import { AbstractFulfillmentProviderService, MedusaError } from "@medusajs/framework/utils";

/** Fulfillment data written by the place-cod-order workflow, never by the client. */
export interface CodFulfillmentData {
  city_id: string;
  fee: number;
}

function readFee(data: Record<string, unknown> | undefined): number {
  const fee = data?.fee;
  if (typeof fee !== "number" || !Number.isFinite(fee) || fee < 0) {
    throw new MedusaError(MedusaError.Types.INVALID_DATA, "cod.feeMissing");
  }
  return fee;
}

/**
 * Manual delivery for COD orders. The price is calculated from the city
 * (moroccan-cities) and the free shipping threshold by the place-cod-order
 * workflow, which passes it in the shipping method data. The generic store
 * routes that could set this data are blocked (src/api/middlewares.ts).
 * Provider id: manual-cod_manual-cod.
 */
export default class ManualCodFulfillmentService extends AbstractFulfillmentProviderService {
  static override identifier = "manual-cod";

  override getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return Promise.resolve([{ id: "manual-cod" }, { id: "manual-cod-return", is_return: true }]);
  }

  override validateFulfillmentData(
    _optionData: Record<string, unknown>,
    data: Record<string, unknown>,
  ): Promise<Record<string, unknown>> {
    readFee(data);
    if (typeof data.city_id !== "string" || data.city_id === "") {
      throw new MedusaError(MedusaError.Types.INVALID_DATA, "cod.cityMissing");
    }
    return Promise.resolve(data);
  }

  override validateOption(): Promise<boolean> {
    return Promise.resolve(true);
  }

  override canCalculate(): Promise<boolean> {
    return Promise.resolve(true);
  }

  override calculatePrice(
    _optionData: CalculateShippingOptionPriceDTO["optionData"],
    data: CalculateShippingOptionPriceDTO["data"],
  ): Promise<CalculatedShippingOptionPrice> {
    return Promise.resolve({
      calculated_amount: readFee(data),
      is_calculated_price_tax_inclusive: true,
    });
  }

  override createFulfillment(): Promise<CreateFulfillmentResult> {
    return Promise.resolve({ data: {}, labels: [] });
  }

  override cancelFulfillment(): Promise<Record<string, unknown>> {
    return Promise.resolve({});
  }

  override createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return Promise.resolve({ data: {}, labels: [] });
  }
}
