/** Pure graph checks for the parent -> child edge set. No imports. */

export interface Edge {
  parentId: string;
  childId: string;
}

/**
 * Would adding `parentId -> childId` create a cycle? True when the child is the
 * proposed parent, or already an ancestor of the proposed parent.
 */
export function createsCycle(
  edges: Edge[],
  parentId: string,
  childId: string,
): boolean {
  if (parentId === childId) return true;

  const parentsOf = new Map<string, string[]>();
  for (const edge of edges) {
    const list = parentsOf.get(edge.childId);
    if (list) list.push(edge.parentId);
    else parentsOf.set(edge.childId, [edge.parentId]);
  }

  // Walk up from the proposed parent; reaching childId means a cycle.
  const stack = [parentId];
  const seen = new Set<string>();
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === childId) return true;
    if (seen.has(current)) continue;
    seen.add(current);
    for (const ancestor of parentsOf.get(current) ?? []) stack.push(ancestor);
  }
  return false;
}
