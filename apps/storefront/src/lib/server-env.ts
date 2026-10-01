import "server-only";
import { nonEmpty, publicEnv } from "./env";

/** Backend URL for server-side calls: the Docker network in production. */
export function medusaServerUrl(): string {
  const internal = nonEmpty(process.env.MEDUSA_INTERNAL_URL)?.replace(/\/+$/, "");
  return internal ?? publicEnv.NEXT_PUBLIC_MEDUSA_BACKEND_URL;
}

/** Seconds StoreSettings stay cached when no revalidation arrives. */
export function settingsRevalidateSeconds(): number {
  const value = Number(process.env.SETTINGS_REVALIDATE_SECONDS ?? 3600);
  return Number.isFinite(value) && value > 0 ? value : 3600;
}

export function revalidateSecret(): string | null {
  return nonEmpty(process.env.REVALIDATE_SECRET) ?? null;
}
