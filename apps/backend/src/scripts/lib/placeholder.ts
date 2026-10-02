import { hexColorSchema } from "@nocido/types";
import { z } from "zod";

export const placeholderShapeSchema = z.object({
  shape: z.enum(["jar", "bottle", "box"]),
  fill: hexColorSchema,
  accent: hexColorSchema,
});
export type PlaceholderShape = z.infer<typeof placeholderShapeSchema>;

/** Product drawing in an 800 x 800 box. */
function shapeBody({ shape, fill, accent }: PlaceholderShape): string {
  return shape === "jar"
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
}

/**
 * Square product placeholder (800 x 800 SVG): a jar, a bottle or a box on a
 * soft background. Colors come from the seed data; replaced by real photos
 * in the admin.
 */
export function placeholderSvg(placeholder: PlaceholderShape): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" width="800" height="800">
  <rect width="800" height="800" fill="${placeholder.fill}" fill-opacity="0.12"/>
  <ellipse cx="400" cy="640" rx="210" ry="26" fill="${placeholder.accent}" fill-opacity="0.18"/>
  ${shapeBody(placeholder)}
</svg>`;
}

export const placeholderSceneSchema = placeholderShapeSchema.extend({
  /** Background gradient, from the top start corner to the bottom end corner. */
  from: hexColorSchema,
  to: hexColorSchema,
});
export type PlaceholderScene = z.infer<typeof placeholderSceneSchema>;

/**
 * Large placeholder for hero slides and category banners: a gradient, a
 * soft halo and the product drawing, kept away from where the storefront
 * writes (bottom of portrait and square images, middle of landscape ones).
 * Replaced by real photos in the admin.
 */
export function placeholderSceneSvg(
  scene: PlaceholderScene,
  size: { width: number; height: number },
): string {
  const { width, height } = size;
  const landscape = width > height * 1.2;
  const box = Math.round(Math.min(width, height) * (landscape ? 0.62 : 0.6));
  const x = Math.round(width / 2 - box / 2);
  const y = landscape ? Math.round(height - box * 0.98) : Math.round(height * 0.06);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${scene.from}"/>
      <stop offset="1" stop-color="${scene.to}"/>
    </linearGradient>
    <radialGradient id="halo">
      <stop offset="0" stop-color="${scene.accent}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${scene.accent}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)"/>
  <circle cx="${Math.round(width / 2)}" cy="${y + Math.round(box / 2)}" r="${box}" fill="url(#halo)"/>
  <g transform="translate(${x} ${y}) scale(${(box / 800).toFixed(4)})">
    <ellipse cx="400" cy="640" rx="210" ry="26" fill="${scene.accent}" fill-opacity="0.25"/>
    ${shapeBody(scene)}
  </g>
</svg>`;
}
