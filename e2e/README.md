# @nocido/e2e

Tests de bout en bout du storefront contre un backend et un storefront **en marche**.

## Playwright : commande à la livraison

`tests/checkout-cod.spec.ts`, sur les trois breakpoints du design (390, 768, 1440) :

- panier → tiroir → `/checkout` multi-produits → page merci (un seul `Purchase` dans le
  dataLayer) → page de suivi ;
- commande en une étape depuis la fiche produit ;
- téléphone invalide refusé, saisie conservée.

Les libellés viennent de `apps/storefront/messages/fr.json` : les tests suivent les changements
de texte. Les commandes créées sont réelles : base jetable (CI) ou de développement.

```sh
pnpm --filter @nocido/e2e e2e                       # E2E_BASE_URL, défaut http://localhost:3000
pnpm --filter @nocido/e2e e2e --project=mobile-390
```

En local, le Chrome installé est utilisé (`E2E_CHANNEL=chrome` par défaut hors CI) : aucun
navigateur à télécharger. En CI, Playwright installe Chromium.

## Lighthouse CI

`lighthouserc.cjs` mesure l'accueil, une catégorie et une fiche produit en **mobile**
(émulation Moto G Power, 4G simulée), trois passes, médiane. La performance doit atteindre
**90** (erreur), accessibilité, SEO et bonnes pratiques sont en avertissement à 90. Les
rapports restent sur disque (`.lighthouseci/`), sans service tiers.

```sh
pnpm --filter @nocido/storefront build && pnpm --filter @nocido/storefront start
LHCI_CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" pnpm --filter @nocido/e2e lhci
```

Variables : `LHCI_BASE_URL`, `LHCI_CATEGORY`, `LHCI_PRODUCT`, `LHCI_RUNS`, `LHCI_CHROME_PATH`.
Toujours mesurer un build de production (`next start`), jamais `next dev`.

## CI

Le job `e2e` de `.github/workflows/ci.yml` démarre PostgreSQL 17, migre, lance `store:setup`
(clé publiable récupérée dans sa sortie) et `catalog:seed`, démarre backend et storefront de
production, puis exécute Playwright et Lighthouse CI. Rapports en artefact `e2e-reports`.
