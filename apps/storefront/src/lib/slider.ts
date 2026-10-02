/**
 * Pure slider logic, shared by the hero slider and its tests. "Step" is +1
 * for the next slide and -1 for the previous one, whatever the direction of
 * the page: only the mapping to screen sides depends on it.
 */

export type Direction = "ltr" | "rtl";

/** Index after moving by `step`, wrapping around. */
export function wrapIndex(index: number, step: number, count: number): number {
  if (count <= 0) return 0;
  return (((index + step) % count) + count) % count;
}

/** Minimum horizontal travel, in pixels, for a swipe. */
export const SWIPE_THRESHOLD = 48;

/**
 * Step for a horizontal swipe of `dx` pixels (negative: finger moved to the
 * left), or 0 when the gesture is too short or mostly vertical. In LTR,
 * swiping to the left reveals the next slide; in RTL the reading order is
 * mirrored, so swiping to the right does.
 */
export function swipeStep(dx: number, dy: number, direction: Direction): -1 | 0 | 1 {
  if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) <= Math.abs(dy)) return 0;
  const towardsEnd = direction === "ltr" ? dx < 0 : dx > 0;
  return towardsEnd ? 1 : -1;
}

/**
 * Horizontal offset, in percent of the width, a slide enters from (exits
 * to: the opposite). Next slides come from the reading end: the right in
 * LTR, the left in RTL.
 */
export function enterOffset(step: number, direction: Direction): number {
  const sign = direction === "ltr" ? 1 : -1;
  return (step >= 0 ? 100 : -100) * sign;
}

/** Arrow keys follow the screen: in RTL the left arrow goes forward. */
export function keyStep(key: string, direction: Direction): -1 | 0 | 1 {
  if (key !== "ArrowLeft" && key !== "ArrowRight") return 0;
  const forward = direction === "ltr" ? "ArrowRight" : "ArrowLeft";
  return key === forward ? 1 : -1;
}

/** Autoplay runs only with several slides, without reduced motion, and when nothing pauses it. */
export function shouldAutoplay(options: {
  count: number;
  autoplay: boolean;
  reducedMotion: boolean;
  paused: boolean;
}): boolean {
  return options.autoplay && options.count > 1 && !options.reducedMotion && !options.paused;
}
