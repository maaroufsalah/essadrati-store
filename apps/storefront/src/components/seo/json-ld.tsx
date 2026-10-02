import { serializeJsonLd } from "@/lib/json-ld";

/** <script type="application/ld+json"> with escaped JSON. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      // Built from our own data and escaped by serializeJsonLd.
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(data) }}
    />
  );
}
