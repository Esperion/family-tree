import {
  layoutTree,
  NODE_W,
  NODE_H,
  type UnionInput,
} from "@/lib/tree-layout";
import type { Person } from "@/lib/family";

interface Props {
  people: Person[];
  unions?: UnionInput[];
}

/** Orthogonal connector: down from the parents, across, down to the child. */
function elbow(fromX: number, fromY: number, toX: number, toY: number) {
  const midY = fromY + (toY - fromY) / 2;
  return `M ${fromX} ${fromY} V ${midY} H ${toX} V ${toY}`;
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function FamilyTreeDiagram({ people, unions = [] }: Props) {
  const layout = layoutTree(people, unions);
  if (layout.nodes.length === 0) return null;

  return (
    <div className="tree-diagram">
      <svg
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        role="img"
        aria-label={`Family tree of ${people.length} people`}
      >
        <g className="tree-edges" fill="none">
          {layout.parentEdges.map((edge, i) => (
            <path
              key={`e${i}`}
              d={elbow(edge.fromX, edge.fromY, edge.toX, edge.toY)}
              stroke="var(--rule)"
              strokeWidth={1.5}
            />
          ))}
        </g>

        <g className="tree-unions">
          {layout.unionLines.map((line, i) => {
            const midX = (line.ax + line.bx) / 2;
            const midY = (line.ay + line.by) / 2;
            return (
              <g key={`u${i}`}>
                <line
                  x1={line.ax}
                  y1={line.ay}
                  x2={line.bx}
                  y2={line.by}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                />
                {line.label && (
                  <text
                    x={midX}
                    y={midY - 5}
                    textAnchor="middle"
                    fontSize={10}
                    fill="var(--muted)"
                    fontFamily="ui-monospace, monospace"
                  >
                    {line.label}
                  </text>
                )}
              </g>
            );
          })}
        </g>

        <g className="tree-nodes">
          {layout.nodes.map((node) => (
            <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
              <rect
                width={NODE_W}
                height={NODE_H}
                rx={6}
                fill="var(--surface)"
                stroke="var(--rule)"
              />
              <circle cx={20} cy={NODE_H / 2} r={13} fill="var(--accent-soft)" />
              {node.photoUrl ? (
                <image
                  href={node.photoUrl}
                  x={7}
                  y={NODE_H / 2 - 13}
                  width={26}
                  height={26}
                  clipPathUnits="objectBoundingBox"
                  preserveAspectRatio="xMidYMid slice"
                />
              ) : (
                <text
                  x={20}
                  y={NODE_H / 2}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={9}
                  fill="var(--accent)"
                  fontFamily="ui-monospace, monospace"
                >
                  {initials(node.name)}
                </text>
              )}
              <text x={40} y={22} fontSize={12} fill="var(--ink)" fontWeight={600}>
                {node.name.length > 18 ? `${node.name.slice(0, 17)}…` : node.name}
              </text>
              <text
                x={40}
                y={39}
                fontSize={10.5}
                fill="var(--accent)"
                fontFamily="ui-monospace, monospace"
              >
                {node.birthYear ?? "?"}
                {node.deathYear ? ` – ${node.deathYear}` : ""}
              </text>
              {node.aliases && node.aliases.length > 0 && (
                <text x={40} y={52} fontSize={9} fill="var(--muted)">
                  aka {node.aliases.join(", ").slice(0, 22)}
                </text>
              )}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}
