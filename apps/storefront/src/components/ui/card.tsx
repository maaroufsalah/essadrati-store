import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** shadcn/ui Card: radius-card (24px in Héritage doré), card tokens, soft shadow. */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border-border bg-card text-card-fg shadow-soft flex flex-col overflow-hidden border",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1.5 p-5", className)} {...props} />;
}

export function CardTitle({ className, children, ...props }: ComponentProps<"h3">) {
  return (
    <h3 className={cn("font-display text-lg leading-snug font-bold", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("text-muted-fg text-sm", className)} {...props} />;
}

export function CardContent({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("p-5 pt-0", className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-auto flex items-center gap-3 p-5 pt-0", className)} {...props} />;
}
