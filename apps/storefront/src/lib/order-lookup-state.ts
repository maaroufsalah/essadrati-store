/** Message keys under `order.lookup.errors`. */
export type LookupErrorKey = "phone" | "number" | "notFound" | "generic";

export type LookupState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: { phone?: LookupErrorKey; number?: LookupErrorKey };
      formError?: LookupErrorKey;
    };

export const LOOKUP_IDLE: LookupState = { status: "idle" };
