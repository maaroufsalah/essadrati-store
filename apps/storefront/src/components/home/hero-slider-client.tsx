"use client";

import { ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  MotionConfig,
  type Variants,
} from "motion/react";
import {
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  type Direction,
  enterOffset,
  keyStep,
  shouldAutoplay,
  swipeStep,
  wrapIndex,
} from "@/lib/slider";
import { cn } from "@/lib/utils";

export interface SliderSlide {
  id: string;
  /** Picture and overlay, rendered on the server. */
  media: ReactNode;
  /** Title, subtitle and button, rendered on the server. */
  content: ReactNode;
  durationMs: number;
  /** "2 / 3", announced by screen readers. */
  label: string;
  /** "Go to slide 2". */
  goToLabel: string;
}

export interface SliderLabels {
  region: string;
  carousel: string;
  slide: string;
  previous: string;
  next: string;
  pause: string;
  play: string;
}

interface HeroSliderClientProps {
  slides: SliderSlide[];
  transition: "fade" | "slide";
  autoplay: boolean;
  direction: Direction;
  labels: SliderLabels;
}

const EASE = [0.22, 1, 0.36, 1] as const;

function slideVariants(transition: "fade" | "slide", direction: Direction): Variants {
  if (transition === "fade") {
    // The incoming slide fades in over the outgoing one, which stays opaque.
    return {
      enter: { opacity: 0, zIndex: 1 },
      center: { opacity: 1, zIndex: 1, transition: { duration: 0.9, ease: EASE } },
      exit: { opacity: 1, zIndex: 0, transition: { duration: 0.9 } },
    };
  }
  return {
    enter: (step: number) => ({ x: `${enterOffset(step, direction)}%` }),
    center: { x: "0%", transition: { duration: 0.75, ease: EASE } },
    exit: (step: number) => ({
      x: `${-enterOffset(step, direction)}%`,
      transition: { duration: 0.75, ease: EASE },
    }),
  };
}

const textVariants: Variants = {
  enter: { opacity: 0, y: 28 },
  center: { opacity: 1, y: 0, transition: { delay: 0.3, duration: 0.7, ease: EASE } },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

/** Reduced motion is assumed until the browser says otherwise: no autoplay before hydration. */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/** True while the tab is hidden or the slider is mostly scrolled away. */
function useOutOfView(ref: RefObject<HTMLElement | null>): boolean {
  const [hiddenTab, setHiddenTab] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  useEffect(() => {
    const onVisibility = () => setHiddenTab(document.visibilityState === "hidden");
    document.addEventListener("visibilitychange", onVisibility);
    const node = ref.current;
    const observer = node
      ? new IntersectionObserver(([entry]) => setOffscreen(!entry?.isIntersecting), {
          threshold: 0.25,
        })
      : null;
    if (node) observer?.observe(node);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      observer?.disconnect();
    };
  }, [ref]);
  return hiddenTab || offscreen;
}

/** Becomes true once the page has loaded and the browser is idle: slides 2+ load after the LCP. */
function useIdleAfterLoad(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancel: (() => void) | undefined;
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        const id = window.requestIdleCallback(() => setReady(true), { timeout: 3000 });
        cancel = () => window.cancelIdleCallback(id);
      } else {
        const id = globalThis.setTimeout(() => setReady(true), 1500);
        cancel = () => globalThis.clearTimeout(id);
      }
    };
    if (document.readyState === "complete") schedule();
    else window.addEventListener("load", schedule, { once: true });
    return () => {
      window.removeEventListener("load", schedule);
      cancel?.();
    };
  }, []);
  return ready;
}

/**
 * Full-width hero slider. The first slide is server-rendered as is (no
 * entrance animation through JavaScript: it holds the LCP image); later
 * slides fade or slide in with Framer Motion and their text rises in.
 * Autoplay is driven by the progress bar of the active dot (its CSS
 * animation pauses with hover, focus, a hidden tab or the pause button),
 * and is off with prefers-reduced-motion. Swipe, arrows and arrow keys
 * follow the reading direction.
 */
export function HeroSliderClient({
  slides,
  transition,
  autoplay,
  direction,
  labels,
}: HeroSliderClientProps) {
  const count = slides.length;
  const [[index, step], setPosition] = useState<[number, number]>([0, 0]);
  const [navigated, setNavigated] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [stopped, setStopped] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const outOfView = useOutOfView(sectionRef);
  const ready = useIdleAfterLoad();
  const swipeStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);

  const go = useCallback(
    (delta: number) => {
      if (count < 2 || delta === 0) return;
      setPosition(([current]) => [wrapIndex(current, delta, count), delta]);
      setNavigated(true);
    },
    [count],
  );

  const goTo = (target: number) => {
    if (target === index) return;
    setPosition([target, target > index ? 1 : -1]);
    setNavigated(true);
  };

  const canAutoplay = shouldAutoplay({
    count,
    autoplay: autoplay && !stopped,
    reducedMotion,
    paused: false,
  });
  const running = canAutoplay && !hovered && !focused && !outOfView;

  const slide = slides[index] ?? slides[0];
  if (!slide) return null;
  const upcoming = slides[wrapIndex(index, 1, count)];

  const onPointerDown = (event: PointerEvent) => {
    if (event.pointerType === "mouse") return;
    swipeStart.current = { x: event.clientX, y: event.clientY };
    swiped.current = false;
  };
  const onPointerUp = (event: PointerEvent) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start) return;
    const delta = swipeStep(event.clientX - start.x, event.clientY - start.y, direction);
    if (delta !== 0) {
      swiped.current = true;
      go(delta);
    }
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const delta = keyStep(event.key, direction);
    if (delta !== 0) {
      event.preventDefault();
      go(delta);
    }
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        {/* Pointer and arrow-key events bubble from the slide links and controls (carousel pattern). */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <section
          ref={sectionRef}
          aria-roledescription={labels.carousel}
          aria-label={labels.region}
          className="dark bg-bg relative isolate aspect-[4/5] w-full touch-pan-y overflow-hidden select-none md:aspect-auto md:h-[85vh] md:max-h-[60rem] md:min-h-[32rem]"
          onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
          onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (swipeStart.current = null)}
          onClickCapture={(event) => {
            if (!swiped.current) return;
            swiped.current = false;
            event.preventDefault();
            event.stopPropagation();
          }}
          onFocus={() => setFocused(true)}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
        >
          <div aria-live={running ? "off" : "polite"} className="absolute inset-0">
            <AnimatePresence initial={false} custom={step}>
              <m.div
                key={slide.id}
                custom={step}
                variants={slideVariants(transition, direction)}
                initial="enter"
                animate="center"
                exit="exit"
                role="group"
                aria-roledescription={labels.slide}
                aria-label={slide.label}
                className="absolute inset-0"
              >
                {slide.media}
                <m.div
                  variants={textVariants}
                  className={cn(
                    "relative h-full",
                    // First paint: a CSS rise only (no opacity), never hidden waiting for JS.
                    !navigated && "animate-in slide-in-from-bottom-6 fill-mode-both duration-1000",
                  )}
                >
                  {slide.content}
                </m.div>
              </m.div>
            </AnimatePresence>
            {ready && upcoming && upcoming.id !== slide.id ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 -z-10 opacity-0"
                key={`preload-${upcoming.id}`}
              >
                {upcoming.media}
              </div>
            ) : null}
          </div>

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={labels.previous}
                className="bg-bg/35 text-fg border-fg/20 hover:bg-bg/70 absolute start-4 top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition-colors md:flex lg:start-8"
              >
                {/* Previous points to the reading start. */}
                <ChevronLeft className="size-6 rtl:hidden" aria-hidden />
                <ChevronRight className="size-6 ltr:hidden" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={labels.next}
                className="bg-bg/35 text-fg border-fg/20 hover:bg-bg/70 absolute end-4 top-1/2 z-10 hidden size-12 -translate-y-1/2 items-center justify-center rounded-full border backdrop-blur transition-colors md:flex lg:end-8"
              >
                <ChevronRight className="size-6 rtl:hidden" aria-hidden />
                <ChevronLeft className="size-6 ltr:hidden" aria-hidden />
              </button>

              <div className="absolute inset-x-0 bottom-3 z-10 flex items-center justify-center gap-1 md:bottom-6">
                {slides.map((item, position) => {
                  const active = position === index;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => goTo(position)}
                      aria-label={item.goToLabel}
                      aria-current={active ? "true" : undefined}
                      className="touch-target group flex items-center justify-center px-1"
                    >
                      <span
                        className={cn(
                          "relative block h-1 overflow-hidden rounded-full transition-all duration-500",
                          active ? "bg-fg/30 w-12" : "bg-fg/50 group-hover:bg-fg/80 w-6",
                        )}
                      >
                        {active ? (
                          <span
                            key={`${item.id}-${index}`}
                            className="bg-fg absolute inset-0 block ltr:origin-left rtl:origin-right"
                            style={
                              canAutoplay
                                ? {
                                    animation: `slider-progress ${item.durationMs}ms linear forwards`,
                                    animationPlayState: running ? "running" : "paused",
                                  }
                                : undefined
                            }
                            onAnimationEnd={(event) => {
                              if (event.animationName === "slider-progress") go(1);
                            }}
                          />
                        ) : null}
                      </span>
                    </button>
                  );
                })}
                {autoplay && !reducedMotion ? (
                  <button
                    type="button"
                    onClick={() => setStopped((value) => !value)}
                    aria-label={stopped ? labels.play : labels.pause}
                    className="touch-target text-fg/80 hover:text-fg ms-1 flex items-center justify-center"
                  >
                    {stopped ? (
                      <Play className="size-4" aria-hidden />
                    ) : (
                      <Pause className="size-4" aria-hidden />
                    )}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}
        </section>
      </MotionConfig>
    </LazyMotion>
  );
}
