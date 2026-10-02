import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "rounded-base inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-fg",
        accent: "bg-accent text-accent-fg",
        muted: "bg-muted text-muted-fg",
        outline: "border-border text-fg border",
        danger: "bg-danger text-bg",
        success: "bg-success text-bg",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

export function Badge({
  className,
  variant,
  ...props
}: ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
