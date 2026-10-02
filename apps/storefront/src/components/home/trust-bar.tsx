import type { TrustIcon } from "@nocido/types";
import {
  Banknote,
  Gift,
  Heart,
  Leaf,
  type LucideIcon,
  Phone,
  ShieldCheck,
  Star,
  Truck,
} from "lucide-react";

const ICONS: Record<TrustIcon, LucideIcon> = {
  truck: Truck,
  cash: Banknote,
  leaf: Leaf,
  shield: ShieldCheck,
  star: Star,
  phone: Phone,
  gift: Gift,
  heart: Heart,
};

export interface TrustItem {
  icon: TrustIcon;
  title: string;
  text: string;
}

/** Store commitments band: 2 columns on phones, 4 from 1024px. */
export function TrustBar({ items, label }: { items: TrustItem[]; label: string }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={label} className="border-border bg-card border-y">
      <ul className="mx-auto grid max-w-7xl grid-cols-2 gap-x-4 gap-y-6 px-4 py-8 sm:px-6 lg:grid-cols-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={`${item.icon}-${item.title}`} className="flex items-start gap-3">
              <span className="bg-muted text-accent rounded-base flex size-11 shrink-0 items-center justify-center">
                <Icon className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-0.5">
                <p className="text-card-fg text-sm font-semibold">{item.title}</p>
                {item.text ? <p className="text-muted-fg text-xs sm:text-sm">{item.text}</p> : null}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
