import { activeByRank } from "@nocido/types/client";
import { describe, expect, it } from "vitest";
import { enterOffset, keyStep, shouldAutoplay, swipeStep, wrapIndex } from "./slider";

describe("slider order", () => {
  const slides = [
    { id: "third", active: true, rank: 3 },
    { id: "hidden", active: false, rank: 0 },
    { id: "first", active: true, rank: 1 },
    { id: "second", active: true, rank: 2 },
  ];

  it("shows active slides only, by rank", () => {
    expect(activeByRank(slides).map((slide) => slide.id)).toEqual(["first", "second", "third"]);
  });

  it("shows nothing when every slide is inactive", () => {
    expect(activeByRank(slides.map((slide) => ({ ...slide, active: false })))).toEqual([]);
  });

  it("wraps around in both directions", () => {
    expect(wrapIndex(2, 1, 3)).toBe(0);
    expect(wrapIndex(0, -1, 3)).toBe(2);
    expect(wrapIndex(1, 1, 3)).toBe(2);
    expect(wrapIndex(0, 1, 0)).toBe(0);
  });
});

describe("slider in LTR", () => {
  it("goes forward when swiping to the left", () => {
    expect(swipeStep(-120, 10, "ltr")).toBe(1);
    expect(swipeStep(120, 10, "ltr")).toBe(-1);
  });

  it("brings the next slide in from the right", () => {
    expect(enterOffset(1, "ltr")).toBe(100);
    expect(enterOffset(-1, "ltr")).toBe(-100);
  });

  it("maps the right arrow key to next", () => {
    expect(keyStep("ArrowRight", "ltr")).toBe(1);
    expect(keyStep("ArrowLeft", "ltr")).toBe(-1);
  });
});

describe("slider in RTL", () => {
  it("mirrors the swipe: swiping to the right goes forward", () => {
    expect(swipeStep(120, 10, "rtl")).toBe(1);
    expect(swipeStep(-120, 10, "rtl")).toBe(-1);
  });

  it("brings the next slide in from the left", () => {
    expect(enterOffset(1, "rtl")).toBe(-100);
    expect(enterOffset(-1, "rtl")).toBe(100);
  });

  it("maps the left arrow key to next", () => {
    expect(keyStep("ArrowLeft", "rtl")).toBe(1);
    expect(keyStep("ArrowRight", "rtl")).toBe(-1);
    expect(keyStep("Enter", "rtl")).toBe(0);
  });
});

describe("gestures and autoplay", () => {
  it("ignores short or vertical gestures", () => {
    expect(swipeStep(-20, 0, "ltr")).toBe(0);
    expect(swipeStep(-80, 140, "ltr")).toBe(0);
  });

  it("stops autoplay for one slide, reduced motion or a pause", () => {
    const base = { count: 3, autoplay: true, reducedMotion: false, paused: false };
    expect(shouldAutoplay(base)).toBe(true);
    expect(shouldAutoplay({ ...base, count: 1 })).toBe(false);
    expect(shouldAutoplay({ ...base, reducedMotion: true })).toBe(false);
    expect(shouldAutoplay({ ...base, paused: true })).toBe(false);
    expect(shouldAutoplay({ ...base, autoplay: false })).toBe(false);
  });
});
