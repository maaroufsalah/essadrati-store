import Image from "next/image";
import { Reveal } from "@/components/motion/primitives";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import type { StoreFormat } from "@/lib/format";
import { isSvg } from "@/lib/product-view";
import { StatNumber } from "./stat-number";

interface StorySectionProps {
  title: string;
  text: string;
  image: { url: string; alt: string } | null;
  stats: { value: number; suffix: string; label: string }[];
  cta: { label: string; href: string } | null;
  format: StoreFormat;
}

/**
 * Dark story band: the `dark` class switches this section to the dark
 * theme tokens whatever the visitor mode, so contrast stays WCAG-checked.
 */
export function StorySection({ title, text, image, stats, cta, format }: StorySectionProps) {
  if (!title && !text) return null;
  return (
    <section className="dark bg-bg text-fg">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-16 lg:py-24">
        <Reveal className="flex flex-col items-start gap-5">
          <h2 className="text-3xl font-bold sm:text-4xl lg:text-5xl">{title}</h2>
          <p className="text-muted-fg text-base leading-relaxed sm:text-lg">{text}</p>
          {cta ? (
            <Button asChild variant="primary" size="lg">
              <Link href={cta.href}>{cta.label}</Link>
            </Button>
          ) : null}
        </Reveal>
        <div className="flex flex-col gap-8">
          {image ? (
            <div className="rounded-card relative aspect-[16/10] overflow-hidden">
              <Image
                src={image.url}
                alt={image.alt}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                unoptimized={isSvg(image.url)}
                className="object-cover"
              />
            </div>
          ) : null}
          {stats.length > 0 ? (
            <dl className="grid grid-cols-2 gap-6 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="border-border flex flex-col gap-1 border-s-2 ps-4">
                  <dt className="text-muted-fg order-2 text-sm">{stat.label}</dt>
                  <dd className="text-primary order-1 text-3xl font-bold tabular-nums sm:text-4xl">
                    <StatNumber value={stat.value} suffix={stat.suffix} format={format} />
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>
    </section>
  );
}
