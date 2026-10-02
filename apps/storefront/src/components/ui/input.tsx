import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** shadcn/ui Input: 48px touch height, radius-base, aria-invalid styles. */
export function Input({ className, type = "text", ...props }: ComponentProps<"input">) {
  return (
    <input
      type={type}
      className={cn(
        "rounded-base border-border bg-card text-card-fg placeholder:text-muted-fg flex h-12 w-full min-w-0 border px-4 text-base transition-colors outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/30 focus-visible:ring-4",
        "aria-invalid:border-danger aria-invalid:ring-danger/20",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(
        "rounded-base border-border bg-card text-card-fg placeholder:text-muted-fg flex min-h-24 w-full border px-4 py-3 text-base outline-none",
        "focus-visible:border-ring focus-visible:ring-ring/30 aria-invalid:border-danger focus-visible:ring-4",
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return (
    // The label is always associated through htmlFor by the caller.
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label className={cn("text-fg text-sm font-medium", className)} {...props} />
  );
}

export function FieldMessage({ className, ...props }: ComponentProps<"p">) {
  return <p role="alert" className={cn("text-danger text-sm", className)} {...props} />;
}
