# @nocido/api-client

Client Medusa typé partagé par le storefront et le mobile. Il enveloppe le JS SDK Medusa
2.21.1 et ajoute les routes du kit, validées avec les schémas zod de `@nocido/types`.

## Usage

```ts
import { createStoreClient } from "@nocido/api-client";

const client = createStoreClient({
  baseUrl: process.env.MEDUSA_BACKEND_URL,
  publishableKey: process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY,
  locale: { locale: "ar", country: settings.contact.country }, // x-medusa-locale: ar-MA
});

const settings = await client.getStoreSettings({ next: { revalidate: 3600 } });
if (settings.ok) settings.data.identity.storeName;

const { products } = await client.sdk.store.product.list();
```

- **Un client par requête côté serveur.** La locale est un en-tête global du client : ne pas
  partager une instance dont la locale change entre deux requêtes.
- **Aucune exception.** Les méthodes du kit renvoient `{ ok: true, data }` ou
  `{ ok: false, error }`. `error.code` est une clé i18n : `network`, `notFound`,
  `unauthorized`, `invalidResponse`, `server`.
- **Cache Next.js.** `getStoreSettings` ajoute le tag `CACHE_TAGS.storeSettings`, que le
  backend revalide après chaque sauvegarde des settings.

## Exports

| Export                    | Rôle                                            |
| ------------------------- | ----------------------------------------------- |
| `createStoreClient`       | SDK Medusa et méthodes du kit, lié à une locale |
| `KIT_ROUTES`              | Routes du kit (`/store/store-settings`...)      |
| `CACHE_TAGS`              | Tags de cache partagés backend et storefront    |
| `LOCALE_HEADER`           | `x-medusa-locale`                               |
| `toApiError`, `ApiResult` | Normalisation des erreurs                       |
| `HttpTypes`               | Types des réponses Medusa (`@medusajs/types`)   |

## Build

```sh
pnpm --filter @nocido/api-client build
pnpm --filter @nocido/api-client test
```
