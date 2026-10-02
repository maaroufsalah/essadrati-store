import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Loading placeholder; the pulse stops with prefers-reduced-motion (preset). */
export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div aria-hidden className={cn("rounded-base bg-muted animate-pulse", className)} {...props} />
  );
}
