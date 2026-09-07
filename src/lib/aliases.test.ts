import { describe, expect, it } from "vitest";

import { formatAliases, parseAliases } from "./aliases";

describe("parseAliases", () => {
  it("splits on commas and trims", () => {
    expect(parseAliases("Maiden,  Nick ,Anglo")).toEqual(["Maiden", "Nick", "Anglo"]);
  });

  it("drops blanks and duplicates", () => {
    expect(parseAliases("A,,A, ,B")).toEqual(["A", "B"]);
  });

  it("returns an empty array for empty input", () => {
    expect(parseAliases("")).toEqual([]);
    expect(parseAliases("   ,  ")).toEqual([]);
  });

  it("round-trips through formatAliases", () => {
    const list = ["Maiden", "Nick"];
    expect(parseAliases(formatAliases(list))).toEqual(list);
  });
});
