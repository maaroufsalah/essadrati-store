import { COLOR_TOKENS } from "@nocido/types/client";
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/** cardFg -> card-fg: the Tailwind names registered by the kit preset. */
const colorNames = COLOR_TOKENS.map((token) =>
  token.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
);

/** tailwind-merge aware of the kit tokens, so `text-fg` and `text-sm` do not collide. */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: colorNames,
      radius: ["base", "card", "button"],
      font: ["display", "body"],
      shadow: ["soft", "card"],
    },
  },
});

/** shadcn/ui class helper. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
