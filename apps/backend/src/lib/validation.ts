import type { MedusaResponse } from "@medusajs/framework/http";
import type { ContrastIssue } from "@nocido/theme";

/** One validation problem. `code` is the i18n key from @nocido/types. */
export interface ValidationIssue {
  path: string;
  code: string;
  details?: ContrastIssue;
}

/** Structural shape of a ZodError (zod is owned by @nocido/types). */
export interface ZodLikeError {
  issues: { code?: string; path: PropertyKey[]; message: string; keys?: string[] }[];
}

/**
 * True for a ZodError from any zod copy. `instanceof` is unreliable here:
 * @nocido/types may resolve its own zod instance.
 */
export function isZodError(error: unknown): error is ZodLikeError {
  return (
    error instanceof Error &&
    error.name === "ZodError" &&
    Array.isArray((error as Partial<ZodLikeError>).issues)
  );
}

export function zodIssues(error: ZodLikeError): ValidationIssue[] {
  return error.issues.flatMap((issue) => {
    const path = issue.path.map(String);
    // Zod's own message for unknown keys is not an i18n key.
    if (issue.code === "unrecognized_keys") {
      return (issue.keys ?? []).map((key) => ({
        path: [...path, key].join("."),
        code: "settings.unknownKey",
      }));
    }
    return [{ path: path.join("."), code: issue.message }];
  });
}

export function contrastIssues(issues: ContrastIssue[]): ValidationIssue[] {
  return issues.map((details) => ({ path: "theme", code: "theme.contrast", details }));
}

/** 400 response shaped like Medusa errors, plus the per-field issues. */
export function sendInvalid(res: MedusaResponse, issues: ValidationIssue[]): void {
  res.status(400).json({ type: "invalid_data", message: "Invalid store settings", issues });
}
