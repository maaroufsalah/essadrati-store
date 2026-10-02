import { hexColorSchema } from "@nocido/types";
import { z } from "zod";

export const placeholderShapeSchema = z.object({
  shape: z.enum(["jar", "bottle", "box"]),
  fill: hexColorSchema,
  accent: hexColorSchema,
});
export type PlaceholderShape = z.infer<typeof placeholderShapeSchema>;

/**
 * Square product placeholder (800 x 800 SVG): a jar, a bottle or a box on a
 * soft background. Colors come from the seed data; replaced by real photos
 * in the admin.
 */
export function placeholderSvg({ shape, fill, accent }: PlaceholderShape): string {
  const body =
    shape === "jar"
      ? `<rect x="250" y="250" width="300" height="360" rx="70" fill="${fill}"/>
         <rect x="285" y="190" width="230" height="70" rx="18" fill="${accent}"/>
         <rect x="290" y="360" width="220" height="120" rx="16" fill="#FFFFFF" fill-opacity="0.85"/>`
      : shape === "bottle"
        ? `<rect x="330" y="160" width="140" height="90" rx="20" fill="${accent}"/>
           <path d="M310 250 h180 l40 90 v260 a40 40 0 0 1 -40 40 h-180 a40 40 0 0 1 -40 -40 v-260 z" fill="${fill}"/>
           <rect x="300" y="390" width="200" height="120" rx="16" fill="#FFFFFF" fill-opacity="0.85"/>`
        : `<rect x="200" y="280" width="400" height="300" rx="24" fill="${fill}"/>
           <rect x="380" y="280" width="40" height="300" fill="${accent}"/>
           <rect x="200" y="400" width="400" height="40" fill="${accent}"/>
           <path d="M400 280 c-60 -90 -150 -40 -90 0 z M400 280 c60 -90 150 -40 90 0 z" fill="${accent}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect width="800" height="800" fill="${fill}" fill-opacity="0.12"/>
  <ellipse cx="400" cy="640" rx="210" ry="26" fill="${accent}" fill-opacity="0.18"/>
  ${body}
</svg>`;
}
