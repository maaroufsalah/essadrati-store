import { describe, expect, it } from "vitest";
import { containsPattern, targetLabel } from "../link-search";
import { droppedMedia, mentions } from "../media-cleanup";

const media = (id: string) => ({ id, url: `http://localhost:9000/static/${id}.jpg` });

describe("media cleanup", () => {
  it("lists the files a write dropped, once each", () => {
    const old = media("old");
    const kept = media("kept");
    expect(droppedMedia([old, kept, old], [kept, media("new")])).toEqual([old]);
    expect(droppedMedia([old, null], [])).toEqual([old]);
    expect(droppedMedia([null, undefined], [media("new")])).toEqual([]);
  });

  it("keeps a file referenced by id or URL elsewhere", () => {
    const file = media("01HXYZ");
    expect(mentions([{ identity: { logoLight: { id: "01HXYZ" } } }], file)).toBe(true);
    expect(mentions(["![photo](http://localhost:9000/static/01HXYZ.jpg)"], file)).toBe(true);
    expect(mentions([{ thumbnail: "http://localhost:9000/static/other.jpg" }], file)).toBe(false);
    // An id inside another id is not a reference.
    expect(mentions([{ id: "01HXYZ2" }], file)).toBe(false);
  });
});

describe("link search", () => {
  it("matches anywhere and takes % and _ literally", () => {
    expect(containsPattern(" miel ")).toBe("%miel%");
    expect(containsPattern("100%_x")).toBe(String.raw`%100\%\_x%`);
  });

  it("labels with the translation, else the base name", () => {
    expect(targetLabel("عسل", { title: "Miel" }, "title")).toBe("Miel");
    expect(targetLabel("عسل", { title: " " }, "title")).toBe("عسل");
    expect(targetLabel("عسل", null, "title")).toBe("عسل");
  });
});
