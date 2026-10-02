"use client";

import { domAnimation, type HTMLMotionProps, LazyMotion, m, MotionConfig } from "motion/react";
import { type ReactNode, useEffect, useRef } from "react";

/**
 * Motion primitives. Use them below the fold only: content above the fold
 * must never wait for JavaScript (LCP). Each primitive loads the reduced
 * DOM feature set (LazyMotion) and turns animations off when the user
 * prefers reduced motion, so pages without them never load motion.
 */

function Scope({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}

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
    <Scope>
      <m.div
        className={className}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-10% 0px" }}
        transition={{ duration: 0.6, ease: EASE, delay }}
      >
        {children}
      </m.div>
    </Scope>
  );
}

/** Container whose StaggerItem children appear one after the other. */
export function Stagger({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Scope>
      <m.div
        className={className}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-10% 0px" }}
        variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {children}
      </m.div>
    </Scope>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <m.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 16 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
      }}
    >
      {children}
    </m.div>
  );
}

/** Subtle press feedback for cards and tiles. */
export function Pressable({ children, ...props }: HTMLMotionProps<"div">) {
  return (
    <Scope>
      <m.div
        whileHover={{ y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.2 }}
        {...props}
      >
        {children}
      </m.div>
    </Scope>
  );
}

/** Ease-out cubic, close to EASE for a counter. */
const easeOut = (progress: number) => 1 - (1 - progress) ** 3;
const COUNT_DURATION = 1400;

/**
 * Counts up to `value` when scrolled into view, formatted by `format`.
 * Plain requestAnimationFrame (no motion engine). The server renders the
 * final value, so it is right without JavaScript and with reduced motion.
 */
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

  useEffect(() => {
    const node = ref.current;
    if (!node || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const progress = Math.min(1, (now - start) / COUNT_DURATION);
        node.textContent = format(Math.round(value * easeOut(progress)));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [format, value]);

  return (
    <span ref={ref} className={className}>
      {format(value)}
    </span>
  );
}
