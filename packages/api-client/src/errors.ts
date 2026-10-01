import { FetchError } from "@medusajs/js-sdk";

/** Normalized API failure. `code` is an i18n key the apps translate. */
export interface ApiError {
  code: "network" | "notFound" | "unauthorized" | "invalidResponse" | "server";
  status: number | null;
  message: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

function codeForStatus(status: number | null): ApiError["code"] {
  if (status === null) return "network";
  if (status === 404) return "notFound";
  if (status === 401 || status === 403) return "unauthorized";
  return "server";
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof FetchError) {
    const status = error.status ?? null;
    return { code: codeForStatus(status), status, message: error.message };
  }
  const message = error instanceof Error ? error.message : String(error);
  return { code: "network", status: null, message };
}
