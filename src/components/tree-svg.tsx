import type { PointerEvent as ReactPointerEvent } from "react";

import {
  NODE_W,
  NODE_H,
  type LayoutNode,
  type EdgePath,
  type UnionSegment,
} from "@/lib/tree-layout";

const AVATAR_CX = 20;
const AVATAR_CY = NODE_H / 2;
const AVATAR_R = 13;

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

interface Props {
  nodes: LayoutNode[];
  paths: EdgePath[];
  unions: UnionSegment[];
  draggingId?: string | null;
  onNodePointerDown?: (id: string, e: ReactPointerEvent) => void;
  onNodePointerMove?: (id: string, e: ReactPointerEvent) => void;
  onNodePointerUp?: (id: string, e: ReactPointerEvent) => void;
}

/**
 * The drawn contents of the family-tree SVG: connectors, union lines and node
 * cards. Presentational — it takes already-positioned nodes and pre-computed
 * edge geometry, and forwards pointer/hover events on each node.
 */
export function TreeSvgLayer({
  nodes,
  paths,
  unions,
  draggingId,
  onNodePointerDown,
  onNodePointerMove,
  onNodePointerUp,
}: Props) {
  return (
    <>
      <defs>
        <clipPath id="ft-avatar-clip">
          <circle cx={AVATAR_CX} cy={AVATAR_CY} r={AVATAR_R} />
        </clipPath>
      </defs>

      <g fill="none">
        {paths.map((path) => (
          <path key={path.key} d={path.d} stroke="var(--rule)" strokeWidth={1.5} />
        ))}
      </g>

      <g>
        {unions.map((line) => (
          <g key={line.key}>
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
        {nodes.map((node) => (
          <g
            key={node.id}
            data-node-id={node.id}
            className={`tree-node${draggingId === node.id ? " is-dragging" : ""}`}
            transform={`translate(${node.x} ${node.y})`}
            onPointerDown={(e) => onNodePointerDown?.(node.id, e)}
            onPointerMove={(e) => onNodePointerMove?.(node.id, e)}
            onPointerUp={(e) => onNodePointerUp?.(node.id, e)}
          >
            <rect
              width={NODE_W}
              height={NODE_H}
              rx={6}
              fill="var(--surface)"
              stroke={draggingId === node.id ? "var(--accent)" : "var(--rule)"}
            />
            <circle cx={AVATAR_CX} cy={AVATAR_CY} r={AVATAR_R} fill="var(--accent-soft)" />
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
