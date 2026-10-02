/**
 * schema.org structured data (JSON-LD) of the storefront. Pure builders;
 * <JsonLd> renders them. URLs are absolute (siteUrl).
 */

type JsonLdObject = Record<string, unknown>;

/** BreadcrumbList from the visible breadcrumb; the last item may have no URL. */
export function breadcrumbJsonLd(items: { name: string; url?: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function organizationJsonLd(store: {
  name: string;
  url: string;
  logo: string | null;
  phone: string | null;
  email: string | null;
  sameAs: string[];
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: store.name,
    url: store.url,
    ...(store.logo ? { logo: store.logo } : {}),
    ...(store.sameAs.length > 0 ? { sameAs: store.sameAs } : {}),
    ...(store.phone || store.email
      ? {
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            ...(store.phone ? { telephone: store.phone } : {}),
            ...(store.email ? { email: store.email } : {}),
          },
        }
      : {}),
  };
}

/** WebSite with a SearchAction on the catalog text search (/products?q=). */
export function websiteJsonLd(site: {
  name: string;
  url: string;
  locale: string;
  searchUrl: string;
}): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: site.name,
    url: site.url,
    inLanguage: site.locale,
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${site.searchUrl}?q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
  };
}

/** ItemList of the products shown on a catalog page, in display order. */
export function itemListJsonLd(
  items: { name: string; url: string }[],
  startPosition = 1,
): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: startPosition + index,
      name: item.name,
      url: item.url,
    })),
  };
}

const QUESTION = /^#{2,3}\s+(.+\?)\s*$/;
const HEADING = /^#{1,6}\s/;

/** Markdown inline syntax removed (links keep their text). */
function plainText(markdown: string): string {
  return markdown
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Questions and answers of a Markdown page: every `##` or `###` heading
 * ending with "?" is a question, the text until the next heading is its
 * answer. Used for FAQPage on pages with at least two of them.
 */
export function faqEntries(markdown: string): { question: string; answer: string }[] {
  const entries: { question: string; answer: string[] }[] = [];
  let current: { question: string; answer: string[] } | null = null;
  for (const line of markdown.split(/\r?\n/)) {
    const question = QUESTION.exec(line);
    if (question?.[1]) {
      current = { question: plainText(question[1]), answer: [] };
      entries.push(current);
    } else if (HEADING.test(line)) {
      current = null;
    } else if (current) {
      current.answer.push(line);
    }
  }
  return entries
    .map((entry) => ({ question: entry.question, answer: plainText(entry.answer.join(" ")) }))
    .filter((entry) => entry.answer.length > 0);
}

export function faqJsonLd(entries: { question: string; answer: string }[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

/** Script content: JSON with "<" escaped so the data cannot close the script tag. */
export function serializeJsonLd(data: JsonLdObject | JsonLdObject[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
