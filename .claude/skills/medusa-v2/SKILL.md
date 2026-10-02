---
name: medusa-v2
description: Working on the Medusa 2.21 backend and admin plugin of this kit (modules, workflows, query.graph, COD orders, StoreSettings, notifications, PDF, cache revalidation). Use before changing apps/backend or apps/admin.
---

# Medusa v2 in this kit

Versions are frozen: Medusa **2.21.1**, admin plugin built with `medusa plugin:build`.
Read `apps/backend/README.md` and `apps/admin/README.md` first.

## Layout

- `apps/backend/src/modules/` — custom modules: `store-settings` (one JSON document, SMTP
  password encrypted with `SETTINGS_ENCRYPTION_KEY`), `moroccan-cities` (zones, cities, fees),
  `pages` (CMS, Markdown per locale), `cod-payment` (`pp_cod_cod`), `manual-cod` (fulfillment).
- `src/workflows/cod/` — `place-cod-order` (cart from items or cart id, fee from the city,
  COD payment, completion, `metadata.cod_status=pending`), `confirm-cod`.
- `src/api/` — store routes (`/store/store-settings`, `/store/cities`, `/store/pages`,
  `/store/cod/orders`, `/store/cod/orders/:id`, `/store/cod/orders/lookup`) and admin routes.
  Route paths and cache tags are shared through `KIT_ROUTES` / `CACHE_TAGS` of `@nocido/api-client`.
- `src/subscribers/` — storefront revalidation (catalog, settings, pages) and order
  notifications (`cod.order_*`, `shipment.created`, `delivery.created`).
- `src/lib/notifications` (emails + WhatsApp stub), `src/lib/documents` (invoice and delivery
  note, HTML rendered by Chromium through `PdfRenderer`).

## Rules learned the hard way

- **StoreSettings are saved by insert + soft delete**, never `update`: Medusa deep-merges JSON
  columns, so removed keys would survive.
- **Generic cart endpoints are closed** (`POST /store/carts/:id/shipping-methods` and
  `/complete` return 403): every order goes through `POST /store/cod/orders`, which computes
  the fee server-side. Keep the `Idempotency-Key` handling (cache + locking, 24 h).
- **Carts carry the customer locale** (`fr-MA`…): Medusa then translates line item titles.
- **`query.graph` results**: typed by `.medusa/types` once generated, `any` before (CI lints
  before building). Route results through `unknown` (`const rows: unknown[] = data`) so lint
  passes in both cases.
- **Admin plugin**: after a change, `pnpm --filter @nocido/admin build`, then restart the
  backend. Declare every package the plugin build imports (`@medusajs/admin-shared`, React
  types) in `apps/admin/package.json`: the isolated linker does not hoist them.
- **Admin pages** live under `/settings/<page>`; never reuse a native page name
  (`/settings/store` hid Medusa's own page). Use `dirtyFields`, not `isDirty`, for the
  unsaved indicator (localized fields give false positives).
- **Admin `backendUrl`** is `/` in production (dashboard on its own domain, proxied to the
  backend); override with `ADMIN_BACKEND_URL`.
- **Windows**: the `medusa develop` watcher may crash on restart (`taskkill` PID not found):
  restart by hand. Never run `pnpm setup` (pnpm builtin); the script is `store:setup`.
- **Notifications never throw** into workflows; emails only go to real addresses (not the
  technical `@technicalEmailDomain` ones). No Medusa Notification provider: it cannot read the
  `store-settings` module.

## Commands

```sh
pnpm db:tunnel                                   # dev DB on the VPS
pnpm --filter @nocido/backend db:migrate
pnpm --filter @nocido/backend store:setup        # idempotent, prints the publishable key
pnpm --filter @nocido/backend catalog:seed
pnpm --filter @nocido/backend dev
pnpm --filter @nocido/backend test               # unit (Vitest)
pnpm --filter @nocido/backend test:integration   # essadrati_test through the tunnel
```

Validation errors are i18n codes (`cod.email.invalid`, `phone.invalid`…) shared with the
apps; add new codes to the admin dictionary (`error.<code>`) and storefront messages.
