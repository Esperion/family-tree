import { generations, type Person } from "./family";

/**
 * Pure layered layout for the family-tree diagram.
 *
 * `layoutTree` fixes each person's row (their generation) and a starting x
 * near the midpoint of their parents. Edges are returned by id, not by pixel,
 * so the canvas can recompute connector geometry after a node is dragged —
 * `edgeGeometry` does that from whatever positions it is handed.
 */

export const NODE_W = 172;
export const NODE_H = 58;
const H_GAP = 22;
const ROW_GAP = 78;
export const PAD = 24;
const ROW_H = NODE_H + ROW_GAP;

export interface LayoutNode {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  gender?: string | null;
  notes?: string | null;
  aliases?: string[];
  photoUrl?: string | null;
  parentIds: string[];
  /** Top-left corner. */
  x: number;
  y: number;
  gen: number;
}

/** A child and the parents it hangs from, referenced by id. */
export interface ParentEdge {
  childId: string;
  parentIds: string[];
}

export interface UnionLink {
  aId: string;
  bId: string;
  label: string | null;
}

export interface UnionInput {
  partnerAId: string;
  partnerBId: string;
  kind: string;
  startYear: number | null;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  parentEdges: ParentEdge[];
  unions: UnionLink[];
  width: number;
  height: number;
}

const EMPTY: TreeLayout = {
  nodes: [],
  parentEdges: [],
  unions: [],
  width: 0,
  height: 0,
};

export function layoutTree(people: Person[], unions: UnionInput[] = []): TreeLayout {
  if (people.length === 0) return EMPTY;

  const rows = generations(people);
  const genOf = new Map<string, number>();
  rows.forEach((row, gen) => row.forEach((person) => genOf.set(person.id, gen)));

  const rowTop = (gen: number) => PAD + gen * ROW_H;
  const centerX = new Map<string, number>();

  rows.forEach((row) => {
    const placed = row.map((person) => {
      const parentXs = person.parents
        .map((id) => centerX.get(id))
        .filter((v): v is number => v !== undefined);
      const desired = parentXs.length
        ? parentXs.reduce((a, b) => a + b, 0) / parentXs.length
        : Number.POSITIVE_INFINITY;
      return { person, desired };
    });

    placed.sort(
      (a, b) =>
        a.desired - b.desired ||
        (a.person.birthYear ?? 9999) - (b.person.birthYear ?? 9999) ||
        a.person.name.localeCompare(b.person.name),
    );

    let cursor = PAD;
    for (const { person, desired } of placed) {
      const left = Number.isFinite(desired)
        ? Math.max(cursor, desired - NODE_W / 2)
        : cursor;
      centerX.set(person.id, left + NODE_W / 2);
      cursor = left + NODE_W + H_GAP;
    }
  });

  const nodes: LayoutNode[] = people.map((person) => {
    const gen = genOf.get(person.id) as number;
    return {
      id: person.id,
      name: person.name,
      birthYear: person.birthYear,
      deathYear: person.deathYear,
      gender: person.gender ?? null,
      notes: person.notes ?? null,
      aliases: person.aliases,
      photoUrl: person.photoUrl,
      parentIds: person.parents,
      x: (centerX.get(person.id) as number) - NODE_W / 2,
      y: rowTop(gen),
      gen,
    };
  });

  const parentEdges: ParentEdge[] = people
    .filter((person) => person.parents.some((id) => centerX.has(id)))
    .map((person) => ({
      childId: person.id,
      parentIds: person.parents.filter((id) => centerX.has(id)),
    }));

  const unionLinks: UnionLink[] = unions
    .filter((u) => centerX.has(u.partnerAId) && centerX.has(u.partnerBId))
    .map((u) => ({
      aId: u.partnerAId,
      bId: u.partnerBId,
      label: u.startYear
        ? `${u.kind === "MARRIAGE" ? "m. " : ""}${u.startYear}`
        : null,
    }));

  const width = Math.max(...nodes.map((n) => n.x + NODE_W)) + PAD;
  const height = rowTop(rows.length - 1) + NODE_H + PAD;

  return { nodes, parentEdges, unions: unionLinks, width, height };
}

// ---------------------------------------------------------------------------
// Geometry — pixel coordinates from a set of (possibly dragged) node positions.
// ---------------------------------------------------------------------------

export interface Point {
  x: number;
  y: number;
}

export interface EdgePath {
  key: string;
  d: string;
}

export interface UnionSegment {
  key: string;
  ax: number;
  ay: number;
  bx: number;
  by: number;
  label: string | null;
}

const center = (n: Point) => ({ x: n.x + NODE_W / 2, y: n.y + NODE_H / 2 });

/** Orthogonal connector: down from the parents, across, then down to the child. */
function elbow(fromX: number, fromY: number, toX: number, toY: number) {
  const midY = fromY + (toY - fromY) / 2;
  return `M ${fromX} ${fromY} V ${midY} H ${toX} V ${toY}`;
}

export function edgeGeometry(
  positions: Map<string, Point>,
  parentEdges: ParentEdge[],
  unions: UnionLink[],
): { paths: EdgePath[]; unionSegments: UnionSegment[] } {
  const paths: EdgePath[] = [];
  for (const edge of parentEdges) {
    const child = positions.get(edge.childId);
    const parents = edge.parentIds
      .map((id) => positions.get(id))
      .filter((p): p is Point => p !== undefined);
    if (!child || parents.length === 0) continue;

    const fromX =
      parents.reduce((sum, p) => sum + center(p).x, 0) / parents.length;
    const fromY = Math.max(...parents.map((p) => p.y + NODE_H));
    paths.push({
      key: edge.childId,
      d: elbow(fromX, fromY, center(child).x, child.y),
    });
  }

  const unionSegments: UnionSegment[] = [];
  for (const link of unions) {
    const a = positions.get(link.aId);
    const b = positions.get(link.bId);
    if (!a || !b) continue;
    unionSegments.push({
      key: `${link.aId}~${link.bId}`,
      ax: center(a).x,
      ay: center(a).y,
      bx: center(b).x,
      by: center(b).y,
      label: link.label,
    });
  }

  return { paths, unionSegments };
}
