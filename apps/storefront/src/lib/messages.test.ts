import { LOCALES } from "@nocido/types";
import { describe, expect, it } from "vitest";
import ar from "../../messages/ar.json";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

const MESSAGES = { ar, fr, en };

function keys(value: unknown, prefix = ""): string[] {
  if (typeof value !== "object" || value === null) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    keys(child, prefix ? `${prefix}.${key}` : key),
  );
}

function placeholders(text: string): string[] {
  return [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1] ?? "").sort();
}

describe("messages", () => {
  const reference = keys(fr).sort();

  it.each(LOCALES)("%s has exactly the reference keys", (locale) => {
    expect(keys(MESSAGES[locale]).sort()).toEqual(reference);
  });

  it.each(LOCALES)("%s keeps every ICU placeholder", (locale) => {
    for (const key of reference) {
      const get = (source: unknown) =>
        key
          .split(".")
          .reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], source);
      expect(placeholders(String(get(MESSAGES[locale]))), key).toEqual(
        placeholders(String(get(fr))),
      );
    }
  });
});
