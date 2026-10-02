---
name: i18n-rtl
description: Internationalization and right-to-left rules of this kit (next-intl ar/fr/en, localized settings, messages, Arabic text in emails, PDF and OG images, numbering systems). Use when adding text, routes or layout styles.
---

# i18n and RTL

Locales: `ar` (RTL, kit default), `fr`, `en`. Enabled locales and the default come from
StoreSettings (admin › Langues).

## Storefront

- next-intl, **always-prefixed** routes (`/ar`, `/fr`, `/en`); the middleware redirects to
  enabled locales. `Link`, `redirect`, `useRouter` come from `@/i18n/navigation`.
- Kit wording: `apps/storefront/messages/{ar,fr,en}.json`, **French is the reference**.
  `src/lib/messages.test.ts` checks that every key exists in every language with the same ICU
  arguments (plural branches like `=0 {…}` are text, not arguments).
- Store content (`LocalizedString`) is resolved with `resolveLocalized(value, locale,
[defaultLocale])`. In client components import helpers from `@nocido/types/client` (no zod in
  the bundle).
- Numbers, prices and dates go through `lib/format.ts` with the store numbering system
  (`latn`/`arab`) and time zone. Order numbers: `useGrouping: false`.

## RTL

- Logical properties only: `ms`/`me`, `ps`/`pe`, `start`/`end`, `border-s`, `text-start`.
  Physical ones are ESLint errors. Directional icons: pair them with `rtl:hidden`/`ltr:hidden`.
- Phones, emails, SKUs, variant labels: `<bdi dir="ltr">`. Free text that may be Arabic inside a
  Latin page (names, addresses): `<bdi dir="auto">`.
- Inside a translated string, wrap an LTR value with Unicode isolates
  (`String.fromCodePoint(0x2066)` … `0x2069`); never paste the raw characters in source.
- Language switcher: the other languages use the system font, so a French page does not
  download the Arabic font subsets.

## Outside the storefront

- Emails (`apps/backend/src/lib/notifications/messages.ts`): one dictionary per locale, `dir`
  and `lang` set on the document, sent in the order language (`metadata.locale`).
- PDF documents are French (Moroccan invoices); Arabic names render correctly because Chromium
  shapes them.
- OG images (`/api/og`): Satori does not shape Arabic, cards for Arabic pages use the first
  enabled Latin locale.
- Admin plugin copy: `apps/admin/src/admin/lib/i18n.ts` (fr reference, en complete).
