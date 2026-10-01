/** Docker healthcheck. Does not call the backend: the storefront degrades without it. */
export function GET(): Response {
  return Response.json({ status: "ok" });
}

export const dynamic = "force-dynamic";
