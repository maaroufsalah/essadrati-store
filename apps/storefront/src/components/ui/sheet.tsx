"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import * as SheetPrimitive from "@radix-ui/react-dialog";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** shadcn/ui Sheet with logical sides: `start` follows the reading direction. */
export const Sheet = SheetPrimitive.Root;
export const SheetTrigger = SheetPrimitive.Trigger;
export const SheetClose = SheetPrimitive.Close;

const sheetVariants = cva(
  "fixed z-50 flex flex-col gap-4 bg-card text-card-fg shadow-card transition ease-in-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-300",
  {
    variants: {
      side: {
        start:
          "inset-y-0 start-0 h-full w-4/5 max-w-sm border-e border-border data-[state=closed]:slide-out-to-start data-[state=open]:slide-in-from-start",
        end: "inset-y-0 end-0 h-full w-4/5 max-w-sm border-s border-border data-[state=closed]:slide-out-to-end data-[state=open]:slide-in-from-end",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-card border-t border-border pb-safe data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
      },
    },
    defaultVariants: { side: "start" },
  },
);

interface SheetContentProps
  extends ComponentProps<typeof SheetPrimitive.Content>, VariantProps<typeof sheetVariants> {
  /** Accessible label of the close button (from next-intl). */
  closeLabel: string;
}

export function SheetContent({
  side,
  className,
  children,
  closeLabel,
  ...props
}: SheetContentProps) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay className="bg-fg/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 fixed inset-0 z-50" />
      <SheetPrimitive.Content className={cn(sheetVariants({ side }), className)} {...props}>
        {children}
        <SheetPrimitive.Close className="touch-target rounded-base text-muted-fg hover:text-fg absolute end-3 top-3 inline-flex items-center justify-center">
          <X className="size-5" aria-hidden />
          <span className="sr-only">{closeLabel}</span>
        </SheetPrimitive.Close>
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 pe-14", className)} {...props} />;
}

export function SheetTitle({ className, ...props }: ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title className={cn("font-display text-lg", className)} {...props} />;
}

export function SheetDescription({
  className,
  ...props
}: ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description className={cn("text-muted-fg text-sm", className)} {...props} />
  );
}
