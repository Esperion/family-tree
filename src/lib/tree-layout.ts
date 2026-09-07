import { generations, type Person } from "./family";

/**
 * Pure layered layout for the family-tree diagram.
 *
 * Rows are generations (oldest at the top). Within a row each person is drawn
 * near the midpoint of their parents and then swept rightwards so nothing
 * overlaps — children end up roughly under their parents, which keeps the
 * connector lines short for POC-sized trees.
 */

export const NODE_W = 168;
export const NODE_H = 58;
const H_GAP = 22;
const ROW_GAP = 76;
export const PAD = 24;
const ROW_H = NODE_H + ROW_GAP;

export interface LayoutNode {
  id: string;
  name: string;
  birthYear?: number;
  deathYear?: number;
  aliases?: string[];
  photoUrl?: string | null;
  /** Top-left corner. */
  x: number;
  y: number;
  gen: number;
}

export interface Connector {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
}

export interface UnionInput {
  partnerAId: string;
  partnerBId: string;
  kind: string;
  startYear: number | null;
}

export interface UnionLine {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  label: string | null;
}

export interface TreeLayout {
  nodes: LayoutNode[];
  parentEdges: Connector[];
  unionLines: UnionLine[];
  width: number;
  height: number;
}

const EMPTY: TreeLayout = {
  nodes: [],
  parentEdges: [],
  unionLines: [],
  width: 0,
  height: 0,
};

export function layoutTree(people: Person[], unions: UnionInput[] = []): TreeLayout {
  if (people.length === 0) return EMPTY;

  const rows = generations(people);
  const genOf = new Map<string, number>();
  rows.forEach((row, gen) => row.forEach((person) => genOf.set(person.id, gen)));

  const rowTop = (gen: number) => PAD + gen * ROW_H;

  // Center x of each node, filled row by row from the top.
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
      aliases: person.aliases,
      photoUrl: person.photoUrl,
      x: (centerX.get(person.id) as number) - NODE_W / 2,
      y: rowTop(gen),
      gen,
    };
  });

  const parentEdges: Connector[] = [];
  for (const person of people) {
    const parentXs = person.parents
      .map((id) => centerX.get(id))
      .filter((v): v is number => v !== undefined);
    if (parentXs.length === 0) continue;

    const parentGen = Math.max(
      ...person.parents.map((id) => genOf.get(id) ?? 0),
    );
    parentEdges.push({
      fromX: parentXs.reduce((a, b) => a + b, 0) / parentXs.length,
      fromY: rowTop(parentGen) + NODE_H,
      toX: centerX.get(person.id) as number,
      toY: rowTop(genOf.get(person.id) as number),
    });
  }

  const unionLines: UnionLine[] = [];
  for (const union of unions) {
    const ax = centerX.get(union.partnerAId);
    const bx = centerX.get(union.partnerBId);
    if (ax === undefined || bx === undefined) continue;
    unionLines.push({
      ax,
      ay: rowTop(genOf.get(union.partnerAId) as number) + NODE_H / 2,
      bx,
      by: rowTop(genOf.get(union.partnerBId) as number) + NODE_H / 2,
      label: union.startYear
        ? `${union.kind === "MARRIAGE" ? "m. " : ""}${union.startYear}`
        : null,
    });
  }

  const width = Math.max(...nodes.map((n) => n.x + NODE_W)) + PAD;
  const height = rowTop(rows.length - 1) + NODE_H + PAD;

  return { nodes, parentEdges, unionLines, width, height };
}
