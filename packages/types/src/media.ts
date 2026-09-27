import { z } from "zod";

/**
 * A file stored by the Medusa File Module (local provider on the VPS).
 * `id` is the File Module identifier, `url` the public URL served by Nginx.
 */
export const mediaRefSchema = z.object({
  id: z.string().min(1),
  url: z.url(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  mimeType: z.string().optional(),
});
export type MediaRef = z.infer<typeof mediaRefSchema>;

export const optionalMediaSchema = mediaRefSchema.nullable();
