"use client";

import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
  type HTMLMotionProps,
} from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Motion primitives. Use them below the fold only: content above the fold
 * must never wait for JavaScript (LCP). MotionConfig (providers.tsx) turns
 * every animation off when the user prefers reduced motion.
 */

const EASE = [0.22, 1, 0.36, 1] as const;

/** Fades and rises into view once. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.6, ease: EASE, delay }}
    >
      {children}
    </motion.div>
  );
}

/** Container whose StaggerItem children appear one after the other. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-10% 0px" }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </motion.div>
  );
}

/** Subtle press feedback for cards and tiles. */
export function Pressable({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.2 }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

/** Counts up to `value` when scrolled into view, formatted by `format`. */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (value: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const reduced = useReducedMotion();
  const count = useMotionValue(0);
  const text = useTransform(count, (latest) => format(Math.round(latest)));

  useEffect(() => {
    if (!inView) return;
    if (reduced) {
      count.set(value);
      return;
    }
    const controls = animate(count, value, { duration: 1.4, ease: EASE });
    return () => controls.stop();
  }, [count, inView, reduced, value]);

  return (
    <motion.span ref={ref} className={className}>
      {text}
    </motion.span>
  );
}
