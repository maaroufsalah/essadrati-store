import type { Locale } from "@nocido/types";
import type messages from "../messages/fr.json";

/** Type-safe next-intl: locale union and message keys (fr.json is the reference). */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}
