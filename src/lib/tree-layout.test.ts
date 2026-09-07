import { describe, expect, it } from "vitest";

import { layoutTree, NODE_W, PAD } from "./tree-layout";
import type { Person } from "./family";

const trio: Person[] = [
  { id: "dad", name: "Dad", birthYear: 1950, parents: [] },
  { id: "mum", name: "Mum", birthYear: 1952, parents: [] },
  { id: "kid", name: "Kid", birthYear: 1980, parents: ["dad", "mum"] },
];

describe("layoutTree", () => {
  it("returns nothing for an empty family", () => {
    const l = layoutTree([]);
    expect(l.nodes).toEqual([]);
    expect(l.width).toBe(0);
  });

  it("places a lone person at the top-left pad", () => {
    const l = layoutTree([{ id: "a", name: "A", parents: [] }]);
    expect(l.nodes[0].x).toBe(PAD);
    expect(l.nodes[0].y).toBe(PAD);
  });

  it("puts children on a lower row than their parents", () => {
    const l = layoutTree(trio);
    const kid = l.nodes.find((n) => n.id === "kid")!;
    const dad = l.nodes.find((n) => n.id === "dad")!;
    expect(kid.y).toBeGreaterThan(dad.y);
    expect(kid.gen).toBe(1);
  });

  it("centers a child between its two parents", () => {
    const l = layoutTree(trio);
    const cx = (id: string) => {
      const n = l.nodes.find((x) => x.id === id)!;
      return n.x + NODE_W / 2;
    };
    const mid = (cx("dad") + cx("mum")) / 2;
    expect(Math.abs(cx("kid") - mid)).toBeLessThan(1);
  });

  it("keeps every node inside the reported bounds with no NaN", () => {
    const l = layoutTree(trio);
    for (const n of l.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + NODE_W).toBeLessThanOrEqual(l.width);
      expect(n.y).toBeLessThanOrEqual(l.height);
    }
  });

  it("emits one parent connector per child-with-parents", () => {
    const l = layoutTree(trio);
    expect(l.parentEdges).toHaveLength(1);
    expect(l.parentEdges[0].toY).toBeGreaterThan(l.parentEdges[0].fromY);
  });

  it("draws a union line between recorded partners", () => {
    const l = layoutTree(trio, [
      { partnerAId: "dad", partnerBId: "mum", kind: "MARRIAGE", startYear: 1975 },
    ]);
    expect(l.unionLines).toHaveLength(1);
    expect(l.unionLines[0].label).toBe("m. 1975");
  });
});
