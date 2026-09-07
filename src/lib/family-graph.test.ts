import { describe, expect, it } from "vitest";

import { createsCycle, type Edge } from "./family-graph";

const chain: Edge[] = [
  { parentId: "a", childId: "b" },
  { parentId: "b", childId: "c" },
];

describe("createsCycle", () => {
  it("rejects a person as their own parent", () => {
    expect(createsCycle([], "x", "x")).toBe(true);
  });

  it("allows an unrelated new edge", () => {
    expect(createsCycle(chain, "c", "d")).toBe(false);
  });

  it("rejects making a descendant into an ancestor", () => {
    // c descends from a; making c a parent of a closes the loop
    expect(createsCycle(chain, "c", "a")).toBe(true);
    expect(createsCycle(chain, "b", "a")).toBe(true);
  });

  it("allows a diamond (two parents sharing a grandparent)", () => {
    const edges: Edge[] = [
      { parentId: "g", childId: "p1" },
      { parentId: "g", childId: "p2" },
      { parentId: "p1", childId: "kid" },
    ];
    expect(createsCycle(edges, "p2", "kid")).toBe(false);
  });

  it("terminates on data that already contains a cycle", () => {
    const cyclic: Edge[] = [
      { parentId: "a", childId: "b" },
      { parentId: "b", childId: "a" },
    ];
    expect(() => createsCycle(cyclic, "b", "z")).not.toThrow();
  });
});
