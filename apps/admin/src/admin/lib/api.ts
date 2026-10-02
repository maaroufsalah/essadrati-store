import { KIT_ROUTES } from "@nocido/api-client";
import type { MediaRef, StoreSettings, StoreSettingsUpdate } from "@nocido/types";

declare const __BACKEND_URL__: string | undefined;

/** Backend origin: the dashboard is served by the backend or proxied to it. */
function backendUrl(path: string): string {
  const base =
    typeof __BACKEND_URL__ === "string" && __BACKEND_URL__ !== "" && __BACKEND_URL__ !== "/"
      ? __BACKEND_URL__
      : window.location.origin;
  return new URL(path, base).toString();
}

/** One field problem returned by the backend. `code` is an i18n key. */
export interface ApiIssue {
  path: string;
  code: string;
  details?: unknown;
}

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly issues: ApiIssue[],
    message: string,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface ErrorBody {
  message?: string;
  issues?: ApiIssue[];
}

/** fetch with the admin session cookie. Throws ApiRequestError on non-2xx. */
export async function adminFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const isForm = init.body instanceof FormData;
  const response = await fetch(backendUrl(path), {
    ...init,
    credentials: "include",
    headers: isForm ? init.headers : { "content-type": "application/json", ...init.headers },
  });
  const body = (await response.json().catch(() => ({}))) as T & ErrorBody;
  if (!response.ok) {
    throw new ApiRequestError(
      response.status,
      body.issues ?? [],
      body.message ?? response.statusText,
    );
  }
  return body;
}

export async function fetchSettings(): Promise<StoreSettings> {
  const body = await adminFetch<{ settings: StoreSettings }>(KIT_ROUTES.adminStoreSettings);
  return body.settings;
}

export async function saveSettings(update: StoreSettingsUpdate): Promise<StoreSettings> {
  const body = await adminFetch<{ settings: StoreSettings }>(KIT_ROUTES.adminStoreSettings, {
    method: "POST",
    body: JSON.stringify(update),
  });
  return body.settings;
}

export async function sendTestEmail(to: string): Promise<void> {
  await adminFetch(`${KIT_ROUTES.adminStoreSettings}/test-email`, {
    method: "POST",
    body: JSON.stringify({ to }),
  });
}

export interface NotificationSample {
  kind: string;
  locale: string;
}

export async function fetchNotificationPreview(
  sample: NotificationSample,
): Promise<{ subject: string; html: string }> {
  const query = new URLSearchParams({ kind: sample.kind, locale: sample.locale });
  return adminFetch(`/admin/notifications/preview?${query.toString()}`);
}

export async function sendNotificationTest(
  sample: NotificationSample & { to: string },
): Promise<void> {
  await adminFetch("/admin/notifications/test", { method: "POST", body: JSON.stringify(sample) });
}

function imageSize(file: File): Promise<{ width?: number; height?: number }> {
  if (!file.type.startsWith("image/") || file.type === "image/svg+xml") return Promise.resolve({});
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve({});
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

/** Uploads through the Medusa File Module (local provider on the VPS). */
export async function uploadMedia(file: File): Promise<MediaRef> {
  const form = new FormData();
  form.append("files", file);
  const [size, body] = await Promise.all([
    imageSize(file),
    adminFetch<{ files: { id: string; url: string }[] }>("/admin/uploads", {
      method: "POST",
      body: form,
    }),
  ]);
  const uploaded = body.files[0];
  if (!uploaded) throw new ApiRequestError(500, [], "upload.failed");
  return { id: uploaded.id, url: uploaded.url, mimeType: file.type || undefined, ...size };
}
