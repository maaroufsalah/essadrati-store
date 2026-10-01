import { z } from "zod";

/** Trimmed value, or undefined when unset or blank. */
export function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed === "" ? undefined : trimmed;
}

const url = z.url().transform((value) => value.replace(/\/+$/, ""));

/**
 * Public configuration, inlined at build time. Each variable is read with
 * its full name so Next.js can replace it in the client bundle.
 */
const publicSchema = z.object({
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: url,
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: z.string().startsWith("pk_"),
  NEXT_PUBLIC_SITE_URL: url,
});

export type PublicEnv = z.infer<typeof publicSchema>;

export function parsePublicEnv(source: Record<string, string | undefined>): PublicEnv {
  const result = publicSchema.safeParse(source);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid storefront environment: ${fields}. See apps/storefront/.env.example`);
  }
  return result.data;
}

export const publicEnv: PublicEnv = parsePublicEnv({
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL,
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});
