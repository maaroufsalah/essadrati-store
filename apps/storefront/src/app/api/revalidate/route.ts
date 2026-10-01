import { timingSafeEqual } from "node:crypto";
import { CACHE_TAGS } from "@nocido/api-client";
import { revalidateTag } from "next/cache";
import { z } from "zod";
import { revalidateSecret } from "@/lib/server-env";

const KNOWN_TAGS = Object.values(CACHE_TAGS) as [string, ...string[]];
const bodySchema = z.object({ tags: z.array(z.enum(KNOWN_TAGS)).min(1).max(20) });

function sameSecret(received: string | null, expected: string): boolean {
  if (!received) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * POST /api/revalidate, called by the backend after a write.
 * Header x-revalidate-secret must match REVALIDATE_SECRET. Only kit cache
 * tags are accepted.
 */
export async function POST(request: Request): Promise<Response> {
  const secret = revalidateSecret();
  if (!secret || !sameSecret(request.headers.get("x-revalidate-secret"), secret)) {
    return Response.json({ revalidated: false }, { status: 401 });
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ revalidated: false }, { status: 400 });

  for (const tag of parsed.data.tags) revalidateTag(tag);
  return Response.json({ revalidated: true, tags: parsed.data.tags });
}

export const dynamic = "force-dynamic";
