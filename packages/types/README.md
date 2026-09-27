# @nocido/types

Schémas zod et types TypeScript partagés par le backend, l'admin, le storefront et le mobile.
Les types sont dérivés des schémas : une seule source de vérité.

- Le backend valide chaque écriture avec ces schémas.
- Le storefront et le mobile valident chaque lecture avec ces schémas.
- Les messages d'erreur sont des clés i18n, par exemple `phone.invalid` ou
  `billing.ice.invalid`. Chaque app les traduit dans ses fichiers de messages.

## Contenu

| Module                    | Exporte                                                                                          |
| ------------------------- | ------------------------------------------------------------------------------------------------ |
| `locale`                  | `LOCALES`, `Locale`, `LocalizedString`, `resolveLocalized`, `directionOf`                        |
| `media`                   | `MediaRef` : fichier du File Module Medusa                                                       |
| `phone`                   | `normalizeMoroccanPhone`, `moroccanPhoneSchema`, `toWhatsAppNumber`                              |
| `theme`                   | `ThemeConfig`, `ColorTokens`, `COLOR_TOKENS`, `THEME_PRESET_IDS`, `FONT_IDS`                     |
| `settings/sections`       | Un schéma par section : identity, contact, billing, localization, commerce, smtp, marketing, seo |
| `settings/store-settings` | `StoreSettings`, `PublicStoreSettings`, `StoreSettingsUpdate`, `toPublicStoreSettings`           |

## Trois formes des settings

| Schéma                      | Usage                                                     |
| --------------------------- | --------------------------------------------------------- |
| `storeSettingsSchema`       | Lecture admin, et validation finale après chaque écriture |
| `publicStoreSettingsSchema` | API store publique, lue par le storefront et le mobile    |
| `storeSettingsUpdateSchema` | Payload d'écriture admin, partiel par section             |

La forme publique retire le SMTP, le nom de banque, le RIB et le domaine des emails
techniques. Le mot de passe SMTP est en écriture seule : la lecture expose uniquement
`passwordSet`. Dans une écriture, `password` absent le conserve et `null` l'efface.

## Téléphone

Le téléphone est l'identifiant client du checkout COD. Tous les formats marocains courants
sont normalisés en E.164, par exemple `06 12 34 56 78` devient `+212612345678`. Les
préfixes acceptés sont 6 et 7 pour les mobiles, 5 pour les fixes.

## Build

Build tsup en ESM pour Next.js et Expo, et en CommonJS pour Medusa.

```sh
pnpm --filter @nocido/types build
pnpm --filter @nocido/types test
```
