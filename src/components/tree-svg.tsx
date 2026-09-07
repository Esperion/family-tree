import { NODE_W, NODE_H, type TreeLayout } from "@/lib/tree-layout";

const AVATAR_CX = 20;
const AVATAR_CY = NODE_H / 2;
const AVATAR_R = 13;

/** Orthogonal connector: down from the parents, across, then down to the child. */
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

/**
 * The drawn contents of the family-tree SVG: connectors, union lines and node
 * cards. Shared by the static server render and the interactive canvas, so it
 * carries no wrapper element and no interactivity.
 */
export function TreeSvgLayer({ layout }: { layout: TreeLayout }) {
  return (
    <>
      <defs>
        <clipPath id="ft-avatar-clip">
          <circle cx={AVATAR_CX} cy={AVATAR_CY} r={AVATAR_R} />
        </clipPath>
      </defs>

      <g fill="none">
        {layout.parentEdges.map((edge, i) => (
          <path
            key={`e${i}`}
            d={elbow(edge.fromX, edge.fromY, edge.toX, edge.toY)}
            stroke="var(--rule)"
            strokeWidth={1.5}
          />
        ))}
      </g>

      <g>
        {layout.unionLines.map((line, i) => (
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
                x={(line.ax + line.bx) / 2}
                y={(line.ay + line.by) / 2 - 5}
                textAnchor="middle"
                fontSize={10}
                fill="var(--muted)"
                fontFamily="ui-monospace, monospace"
              >
                {line.label}
              </text>
            )}
          </g>
        ))}
      </g>

      <g>
        {layout.nodes.map((node) => (
          <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={6}
              fill="var(--surface)"
              stroke="var(--rule)"
            />
            <circle
              cx={AVATAR_CX}
              cy={AVATAR_CY}
              r={AVATAR_R}
              fill="var(--accent-soft)"
            />
            {node.photoUrl ? (
              <image
                href={node.photoUrl}
                x={AVATAR_CX - AVATAR_R}
                y={AVATAR_CY - AVATAR_R}
                width={AVATAR_R * 2}
                height={AVATAR_R * 2}
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#ft-avatar-clip)"
              />
            ) : (
              <text
                x={AVATAR_CX}
                y={AVATAR_CY}
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
    </>
  );
}
