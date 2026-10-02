"use client";

import { CountUp } from "@/components/motion/primitives";
import { formatNumber, type StoreFormat } from "@/lib/format";

/** Animated statistic with the store digits (the formatter cannot cross the server boundary). */
export function StatNumber({
  value,
  suffix,
  format,
}: {
  value: number;
  suffix: string;
  format: StoreFormat;
}) {
  return (
    <CountUp value={value} format={(current) => `${formatNumber(current, format)}${suffix}`} />
  );
}
