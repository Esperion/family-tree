import { describe, expect, it } from "vitest";

import { safeSlug, slugify } from "./slug";

describe("slugify", () => {
  it("lowercases and hyphenates", () => {
    expect(slugify("Meyer / Roth")).toBe("meyer-roth");
    expect(slugify("The Okonkwo Family")).toBe("the-okonkwo-family");
  });

  it("collapses runs of punctuation and spaces to one hyphen", () => {
    expect(slugify("O'Brien  --  McHale!!!")).toBe("o-brien-mchale");
  });

  it("decomposes accented Latin letters via NFKD", () => {
    expect(slugify("Café Ström")).toBe("cafe-strom");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  --Hello--  ")).toBe("hello");
  });

  it("returns an empty string when nothing survives", () => {
    expect(slugify("!!!")).toBe("");
    expect(slugify("日本語")).toBe("");
  });
});

describe("safeSlug", () => {
  it("keeps a normal slug untouched", () => {
    expect(safeSlug("Nakamura")).toBe("nakamura");
  });

  it("never returns a reserved route word", () => {
    expect(safeSlug("new")).toBe("new-1");
    expect(safeSlug("API")).toBe("api-1");
  });

  it("never returns empty", () => {
    expect(safeSlug("!!!")).toBe("family-1");
  });
});
