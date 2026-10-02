import { describe, expect, it } from "vitest";
import { isRedirectPath, withRedirect } from "../lib";

describe("redirects", () => {
  it("accepts product, category and page paths only", () => {
    expect(isRedirectPath("/p/asal-ferrane")).toBe(true);
    expect(isRedirectPath("/c/عسل")).toBe(true);
    expect(isRedirectPath("/faq")).toBe(true);
    expect(isRedirectPath("https://evil.example")).toBe(false);
    expect(isRedirectPath("/p/a/b")).toBe(false);
    expect(isRedirectPath("//evil.example")).toBe(false);
  });

  it("collapses chains so every old URL points to the latest one", () => {
    const first = withRedirect([], "/p/a", "/p/b");
    const second = withRedirect(first, "/p/b", "/p/c");
    expect(second).toEqual([
      { from: "/p/a", to: "/p/c" },
      { from: "/p/b", to: "/p/c" },
    ]);
  });

  it("drops a redirect when the handle comes back", () => {
    const rows = withRedirect([{ from: "/p/a", to: "/p/b" }], "/p/b", "/p/a");
    expect(rows).toEqual([{ from: "/p/b", to: "/p/a" }]);
    expect(withRedirect(rows, "/p/a", "/p/a")).toEqual(rows);
  });
});
