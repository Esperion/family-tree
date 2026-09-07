import { describe, expect, it } from "vitest";

import { layoutTree, edgeGeometry, NODE_W, PAD, type Point } from "./tree-layout";
import type { Person } from "./family";

const trio: Person[] = [
  { id: "dad", name: "Dad", birthYear: 1950, parents: [] },
  { id: "mum", name: "Mum", birthYear: 1952, parents: [] },
  { id: "kid", name: "Kid", birthYear: 1980, parents: ["dad", "mum"] },
];

const centerOf = (l: ReturnType<typeof layoutTree>, id: string) => {
  const n = l.nodes.find((x) => x.id === id)!;
  return n.x + NODE_W / 2;
};

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
    expect(l.nodes.find((n) => n.id === "kid")!.y).toBeGreaterThan(
      l.nodes.find((n) => n.id === "dad")!.y,
    );
    expect(l.nodes.find((n) => n.id === "kid")!.gen).toBe(1);
  });

  it("centers a child between its two parents", () => {
    const l = layoutTree(trio);
    const mid = (centerOf(l, "dad") + centerOf(l, "mum")) / 2;
    expect(Math.abs(centerOf(l, "kid") - mid)).toBeLessThan(1);
  });

  it("carries parent ids and detail fields onto the node", () => {
    const people: Person[] = [
      { id: "p", name: "P", parents: [], gender: "F", notes: "founder" },
      { id: "c", name: "C", parents: ["p"] },
    ];
    const l = layoutTree(people);
    expect(l.nodes.find((n) => n.id === "c")!.parentIds).toEqual(["p"]);
    expect(l.nodes.find((n) => n.id === "p")!.gender).toBe("F");
    expect(l.nodes.find((n) => n.id === "p")!.notes).toBe("founder");
  });

  it("emits one parent edge per child-with-parents, referenced by id", () => {
    const l = layoutTree(trio);
    expect(l.parentEdges).toEqual([{ childId: "kid", parentIds: ["dad", "mum"] }]);
  });

  it("keeps every node inside the reported bounds with no NaN", () => {
    const l = layoutTree(trio);
    for (const n of l.nodes) {
      expect(Number.isFinite(n.x) && Number.isFinite(n.y)).toBe(true);
      expect(n.x).toBeGreaterThanOrEqual(0);
      expect(n.x + NODE_W).toBeLessThanOrEqual(l.width);
      expect(n.y).toBeLessThanOrEqual(l.height);
    }
  });

  it("links recorded partners with a formatted label", () => {
    const l = layoutTree(trio, [
      { partnerAId: "dad", partnerBId: "mum", kind: "MARRIAGE", startYear: 1975 },
    ]);
    expect(l.unions).toEqual([{ aId: "dad", bId: "mum", label: "m. 1975" }]);
  });
});

describe("edgeGeometry", () => {
  it("draws a downward elbow from parents to child", () => {
    const l = layoutTree(trio);
    const pos = new Map<string, Point>(l.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    const { paths } = edgeGeometry(pos, l.parentEdges, l.unions);
    expect(paths).toHaveLength(1);
    expect(paths[0].key).toBe("kid");
    expect(paths[0].d.startsWith("M ")).toBe(true);
  });

  it("recomputes union endpoints from the positions it is given", () => {
    const l = layoutTree(trio, [
      { partnerAId: "dad", partnerBId: "mum", kind: "PARTNERSHIP", startYear: null },
    ]);
    const moved = new Map<string, Point>(l.nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    moved.set("dad", { x: 0, y: 0 });
    const { unionSegments } = edgeGeometry(moved, l.parentEdges, l.unions);
    expect(unionSegments[0].ax).toBe(NODE_W / 2);
    expect(unionSegments[0].ay).toBe(29);
    expect(unionSegments[0].label).toBeNull();
  });
});
