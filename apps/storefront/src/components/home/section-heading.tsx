import { ArrowLeft, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  /** "View all" link. */
  action?: { href: string; label: string };
  className?: string;
}

/** Section title with an optional "view all" link aligned to the end. */
export function SectionHeading({ title, subtitle, action, className }: SectionHeadingProps) {
  return (
    <div className={cn("flex items-end justify-between gap-4", className)}>
      <div className="flex max-w-2xl flex-col gap-2">
        <h2 className="text-fg text-2xl font-bold sm:text-3xl lg:text-4xl">{title}</h2>
        {subtitle ? <p className="text-muted-fg text-sm sm:text-base">{subtitle}</p> : null}
      </div>
      {action ? (
        <Link
          href={action.href}
          className="text-accent touch-target inline-flex shrink-0 items-center gap-1 text-sm font-semibold hover:underline"
        >
          {action.label}
          {/* Arrows point to the reading end. */}
          <ArrowRight className="size-4 rtl:hidden" aria-hidden />
          <ArrowLeft className="size-4 ltr:hidden" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}
