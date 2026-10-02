import type { Knex } from "@medusajs/framework/mikro-orm/knex";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";
import { containsPattern } from "./link-search";

interface Resolver {
  resolve<T>(key: string): T;
}

/**
 * Ids of the products whose title, subtitle or handle, in the base language
 * or any translation, contains `query` (case-insensitive). Feeds the text
 * search of the catalog (?q=, WebSite SearchAction).
 */
export async function productIdsMatching(scope: Resolver, query: string): Promise<Set<string>> {
  const knex = scope.resolve<Knex>(ContainerRegistrationKeys.PG_CONNECTION);
  const like = containsPattern(query.slice(0, 100));
  const [base, translated]: [unknown[], unknown[]] = await Promise.all([
    knex("product")
      .select("id")
      .whereNull("deleted_at")
      .andWhere((where) => {
        // Knex builders are thenables: a block body keeps them from being returned.
        void where
          .whereILike("title", like)
          .orWhereILike("subtitle", like)
          .orWhereILike("handle", like);
      }),
    knex("translation")
      .select({ id: "reference_id" })
      .where({ reference: "product" })
      .whereNull("deleted_at")
      .andWhere((where) => {
        void where
          .whereRaw("translations->>'title' ilike ?", [like])
          .orWhereRaw("translations->>'subtitle' ilike ?", [like]);
      }),
  ]);
  return new Set([...base, ...translated].map((row) => (row as { id: string }).id));
}
