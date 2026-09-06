import { describe, expect, it } from "vitest";
import {
  ancestorsOf,
  byId,
  childrenOf,
  descendantsOf,
  family,
  generationOf,
  generations,
  lifespan,
  parentNames,
  rootsOf,
  type Person,
} from "./family";

describe("seed data integrity", () => {
  it("indexes every person exactly once", () => {
    expect(byId(family).size).toBe(family.length);
  });

  it("references only parent ids that exist", () => {
    const known = new Set(family.map((person) => person.id));
    const dangling = family.flatMap((person) =>
      person.parents.filter((parentId) => !known.has(parentId)),
    );
    expect(dangling).toEqual([]);
  });

  it("never lists a person as their own parent", () => {
    const selfParenting = family.filter((person) => person.parents.includes(person.id));
    expect(selfParenting).toEqual([]);
  });
});

describe("rootsOf", () => {
  it("finds the founders and those who married in", () => {
    expect(rootsOf(family).map((person) => person.id).sort()).toEqual([
      "alina",
      "erik",
      "helena",
      "tomas",
    ]);
  });
});

describe("childrenOf", () => {
  it("returns direct children only", () => {
    expect(childrenOf(family, "martin").map((person) => person.id)).toEqual(["lukas", "mia"]);
  });

  it("returns an empty list for someone with no children", () => {
    expect(childrenOf(family, "mia")).toEqual([]);
  });

  it("returns an empty list for an unknown id", () => {
    expect(childrenOf(family, "nobody")).toEqual([]);
  });
});

describe("generationOf", () => {
  it("places founders at generation zero", () => {
    expect(generationOf(family, "tomas")).toBe(0);
    expect(generationOf(family, "helena")).toBe(0);
  });

  it("counts from the deepest parent line, not the shallowest", () => {
    // daniel's parents are erik (gen 0, married in) and ruth (gen 1).
    // The deeper line wins, so daniel is gen 2 rather than gen 1.
    expect(generationOf(family, "daniel")).toBe(2);
  });

  it("walks the full depth of the tree", () => {
    expect(generationOf(family, "ruth")).toBe(1);
    expect(generationOf(family, "martin")).toBe(2);
    expect(generationOf(family, "nina")).toBe(3);
  });

  it("terminates on cyclic data instead of overflowing the stack", () => {
    const cyclic: Person[] = [
      { id: "a", name: "A", parents: ["b"] },
      { id: "b", name: "B", parents: ["a"] },
    ];
    expect(() => generationOf(cyclic, "a")).not.toThrow();
  });
});

describe("generations", () => {
  it("places every person in exactly one row", () => {
    const rows = generations(family);
    const total = rows.reduce((sum, row) => sum + row.length, 0);
    expect(total).toBe(family.length);
  });

  it("produces one row per generation, oldest first", () => {
    expect(generations(family).map((row) => row.length)).toEqual([4, 2, 4, 3]);
  });
});

describe("ancestorsOf", () => {
  it("collects every ancestor without duplicates", () => {
    expect(ancestorsOf(family, "nina").map((person) => person.id).sort()).toEqual([
      "alina",
      "daniel",
      "erik",
      "ruth",
      "tomas",
    ]);
  });

  it("returns nothing for a founder", () => {
    expect(ancestorsOf(family, "tomas")).toEqual([]);
  });
});

describe("descendantsOf", () => {
  it("collects the whole subtree without duplicates", () => {
    // ruth and peter are both children of tomas, so their shared descendants
    // must not be counted twice.
    expect(descendantsOf(family, "tomas")).toHaveLength(9);
  });

  it("returns nothing for a leaf", () => {
    expect(descendantsOf(family, "mia")).toEqual([]);
  });
});

describe("formatting", () => {
  it("shows a closed range for the departed", () => {
    expect(lifespan({ id: "x", name: "X", birthYear: 1898, deathYear: 1969, parents: [] })).toBe(
      "1898 – 1969",
    );
  });

  it("shows a birth year only for the living", () => {
    expect(lifespan({ id: "x", name: "X", birthYear: 1955, parents: [] })).toBe("b. 1955");
  });

  it("resolves parent names and skips unknown ids", () => {
    const person: Person = { id: "x", name: "X", parents: ["tomas", "ghost"] };
    expect(parentNames(family, person)).toEqual(["Tomas Meyer"]);
  });
});
