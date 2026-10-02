"use client";

import type { ComponentProps } from "react";
import { Drawer as DrawerPrimitive } from "vaul";
import { cn } from "@/lib/utils";

/** shadcn/ui Drawer (vaul): bottom sheet with drag-to-close for mobile. */
export function Drawer(props: ComponentProps<typeof DrawerPrimitive.Root>) {
  return <DrawerPrimitive.Root {...props} />;
}

export const DrawerTrigger = DrawerPrimitive.Trigger;
export const DrawerClose = DrawerPrimitive.Close;

export function DrawerContent({
  className,
  children,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Content>) {
  return (
    <DrawerPrimitive.Portal>
      <DrawerPrimitive.Overlay className="bg-fg/40 fixed inset-0 z-50" />
      <DrawerPrimitive.Content
        className={cn(
          "rounded-t-card border-border bg-card text-card-fg pb-safe fixed inset-x-0 bottom-0 z-50 mt-24 flex max-h-[90dvh] flex-col border-t",
          className,
        )}
        {...props}
      >
        <div aria-hidden className="bg-muted mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full" />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPrimitive.Portal>
  );
}

export function DrawerHeader({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("flex flex-col gap-1 p-5 text-center", className)} {...props} />;
}

export function DrawerTitle({ className, ...props }: ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title className={cn("font-display text-lg font-bold", className)} {...props} />
  );
}

export function DrawerDescription({
  className,
  ...props
}: ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description className={cn("text-muted-fg text-sm", className)} {...props} />
  );
}

export function DrawerFooter({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("mt-auto flex flex-col gap-2 p-5", className)} {...props} />;
}
