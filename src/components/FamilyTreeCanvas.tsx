"use client";

import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import {
  edgeGeometry,
  NODE_W,
  NODE_H,
  PAD,
  type LayoutNode,
  type Point,
  type TreeLayout,
} from "@/lib/tree-layout";
import { TreeSvgLayer } from "@/components/tree-svg";

const MIN_K = 0.25;
const MAX_K = 3;
const VIEWPORT_H = 540;
const TIP_W = 250;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

type Offsets = Record<string, { dx: number; dy: number }>;

/**
 * Pan/zoom canvas for the family tree, with draggable people and a hover card.
 *
 * Pan is the viewport's own scroll (so it still works with JS off); zoom scales
 * the scene; dragging a node stores a per-person offset that the connector
 * geometry is recomputed from. The buttons, wheel, node drag and hover card are
 * the parts that need JS.
 */
export function FamilyTreeCanvas({ layout }: { layout: TreeLayout }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [k, setK] = useState(1);
  const [offsets, setOffsets] = useState<Offsets>({});
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hover, setHover] = useState<{ id: string; left: number; top: number; flip: boolean } | null>(
    null,
  );

  const panDrag = useRef<{ x: number; y: number } | null>(null);
  const nodeDrag = useRef<{ id: string; x: number; y: number } | null>(null);
  const zoomAnchor = useRef<{ x: number; y: number; prevK: number } | null>(null);

  // Effective positions after any drags.
  const nodes: LayoutNode[] = useMemo(
    () =>
      layout.nodes.map((n) => {
        const o = offsets[n.id];
        return o ? { ...n, x: n.x + o.dx, y: n.y + o.dy } : n;
      }),
    [layout.nodes, offsets],
  );

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const { paths, unionSegments } = useMemo(() => {
    const pos = new Map<string, Point>(nodes.map((n) => [n.id, { x: n.x, y: n.y }]));
    return edgeGeometry(pos, layout.parentEdges, layout.unions);
  }, [nodes, layout.parentEdges, layout.unions]);

  // Scene grows if a node is dragged past the original bounds.
  const sceneW = Math.max(layout.width, ...nodes.map((n) => n.x + NODE_W + PAD));
  const sceneH = Math.max(layout.height, ...nodes.map((n) => n.y + NODE_H + PAD));

  // Re-anchor scroll after a zoom so the point under the cursor holds still.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    const anchor = zoomAnchor.current;
    zoomAnchor.current = null;
    if (!el || !anchor) return;
    const ratio = k / anchor.prevK;
    el.scrollLeft = (el.scrollLeft + anchor.x) * ratio - anchor.x;
    el.scrollTop = (el.scrollTop + anchor.y) * ratio - anchor.y;
  }, [k]);

  const zoomAt = useCallback((factor: number, clientX?: number, clientY?: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX == null ? el.clientWidth / 2 : clientX - rect.left;
    const y = clientY == null ? el.clientHeight / 2 : clientY - rect.top;
    setK((prev) => {
      const next = clamp(prev * factor, MIN_K, MAX_K);
      if (next !== prev) zoomAnchor.current = { x, y, prevK: prev };
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  // --- viewport pan (empty space only; node drags stopPropagation) ---
  const onPanDown = (e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    panDrag.current = { x: e.clientX, y: e.clientY };
  };
  const onPanMove = (e: ReactPointerEvent) => {
    const el = viewportRef.current;
    if (!panDrag.current || !el) return;
    el.scrollLeft -= e.clientX - panDrag.current.x;
    el.scrollTop -= e.clientY - panDrag.current.y;
    panDrag.current = { x: e.clientX, y: e.clientY };
  };
  const onPanUp = () => {
    panDrag.current = null;
  };

  // --- node drag ---
  const onNodePointerDown = (id: string, e: ReactPointerEvent) => {
    if (e.pointerType !== "mouse") return;
    e.stopPropagation();
    nodeDrag.current = { id, x: e.clientX, y: e.clientY };
    setDraggingId(id);
    setHover(null);
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* capture is a nicety; dragging still works via bubbling */
    }
  };
  const onNodePointerMove = (id: string, e: ReactPointerEvent) => {
    const drag = nodeDrag.current;
    if (!drag || drag.id !== id) return;
    const dx = (e.clientX - drag.x) / k;
    const dy = (e.clientY - drag.y) / k;
    drag.x = e.clientX;
    drag.y = e.clientY;
    setOffsets((o) => ({
      ...o,
      [id]: { dx: (o[id]?.dx ?? 0) + dx, dy: (o[id]?.dy ?? 0) + dy },
    }));
  };
  const onNodePointerUp = (id: string, e: ReactPointerEvent) => {
    if (nodeDrag.current?.id !== id) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* no-op */
    }
    nodeDrag.current = null;
    setDraggingId(null);
  };

  // Fallback: a mouseup anywhere ends a drag even if capture was lost.
  useLayoutEffect(() => {
    const end = () => {
      if (nodeDrag.current) {
        nodeDrag.current = null;
        setDraggingId(null);
      }
    };
    window.addEventListener("pointerup", end);
    return () => window.removeEventListener("pointerup", end);
  }, []);

  // --- hover card (delegated on the svg; pointerover/out bubble reliably) ---
  const onSvgPointerOver = (e: ReactPointerEvent) => {
    if (nodeDrag.current || panDrag.current) return;
    const g = (e.target as Element).closest<SVGGElement>("g.tree-node");
    const canvas = canvasRef.current;
    if (!g || !canvas) return;
    const id = g.dataset.nodeId;
    if (!id) return;
    setHover((prev) => {
      if (prev?.id === id) return prev;
      const gr = g.getBoundingClientRect();
      const cr = canvas.getBoundingClientRect();
      const flip = gr.right - cr.left + TIP_W + 20 > cr.width;
      return {
        id,
        left: flip ? gr.left - cr.left - TIP_W - 10 : gr.right - cr.left + 10,
        top: clamp(gr.top - cr.top, 8, cr.height - 150),
        flip,
      };
    });
  };
  const onSvgPointerOut = (e: ReactPointerEvent) => {
    const to = e.relatedTarget as Element | null;
    if (!to || !to.closest?.("g.tree-node")) setHover(null);
  };

  const reset = () => {
    setK(1);
    setOffsets({});
    setHover(null);
    viewportRef.current?.scrollTo({ left: 0, top: 0 });
  };

  const hoveredNode = hover ? nodeById.get(hover.id) : null;
  const parentNames = hoveredNode
    ? hoveredNode.parentIds
        .map((pid) => nodeById.get(pid)?.name)
        .filter((n): n is string => Boolean(n))
    : [];

  return (
    <div className="tree-canvas" ref={canvasRef}>
      <p className="tree-canvas-hint">Drag people to rearrange · hover for details · scroll to zoom</p>

      <div
        ref={viewportRef}
        className="tree-canvas-viewport"
        style={{ height: VIEWPORT_H }}
        onPointerDown={onPanDown}
        onPointerMove={onPanMove}
        onPointerUp={onPanUp}
        onPointerCancel={onPanUp}
      >
        <div className="tree-canvas-scene" style={{ width: sceneW * k, height: sceneH * k }}>
          <svg
            width={sceneW}
            height={sceneH}
            viewBox={`0 0 ${sceneW} ${sceneH}`}
            style={{ transform: `scale(${k})`, transformOrigin: "0 0" }}
            role="img"
            aria-label={`Family tree, ${nodes.length} people`}
            onPointerOver={onSvgPointerOver}
            onPointerOut={onSvgPointerOut}
          >
            <TreeSvgLayer
              nodes={nodes}
              paths={paths}
              unions={unionSegments}
              draggingId={draggingId}
              onNodePointerDown={onNodePointerDown}
              onNodePointerMove={onNodePointerMove}
              onNodePointerUp={onNodePointerUp}
            />
          </svg>
        </div>
      </div>

      {hoveredNode && hover && (
        <div className="tree-tip" style={{ left: hover.left, top: hover.top, width: TIP_W }}>
          <p className="tree-tip-name">{hoveredNode.name}</p>
          {hoveredNode.aliases && hoveredNode.aliases.length > 0 && (
            <p className="tree-tip-row">aka {hoveredNode.aliases.join(", ")}</p>
          )}
          <p className="tree-tip-row">
            {hoveredNode.birthYear ? `b. ${hoveredNode.birthYear}` : "birth unknown"}
            {hoveredNode.deathYear ? ` · d. ${hoveredNode.deathYear}` : ""}
          </p>
          {hoveredNode.gender && <p className="tree-tip-row">{hoveredNode.gender}</p>}
          {parentNames.length > 0 && (
            <p className="tree-tip-row">Parents: {parentNames.join(" & ")}</p>
          )}
          {hoveredNode.notes && <p className="tree-tip-notes">{hoveredNode.notes}</p>}
        </div>
      )}

      <div className="tree-canvas-controls" aria-hidden="true">
        <button type="button" onClick={() => zoomAt(1.25)} title="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomAt(0.8)} title="Zoom out">
          −
        </button>
        <button type="button" onClick={reset} title="Reset view">
          Reset
        </button>
      </div>
    </div>
  );
}
