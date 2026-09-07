"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";

import type { TreeLayout } from "@/lib/tree-layout";
import { TreeSvgLayer } from "@/components/tree-svg";

const MIN_K = 0.25;
const MAX_K = 3;
const VIEWPORT_H = 540;

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/**
 * Pan/zoom wrapper around the tree SVG. Pan is the viewport's own scroll
 * position (so it still works, and still scrolls, with JS disabled); zoom
 * scales the scene and re-anchors scroll so the point under the pointer
 * stays put. The buttons and wheel are the only things that need JS.
 */
export function FamilyTreeCanvas({ layout }: { layout: TreeLayout }) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  const pendingAnchor = useRef<{ x: number; y: number; prevK: number } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);

  // After a zoom, shift scroll so the anchored point holds still.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    const anchor = pendingAnchor.current;
    pendingAnchor.current = null;
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
      if (next !== prev) pendingAnchor.current = { x, y, prevK: prev };
      return next;
    });
  }, []);

  // Native, non-passive wheel listener so preventDefault actually works.
  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && Math.abs(e.deltaY) < 1) return;
      e.preventDefault();
      zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX, e.clientY);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomAt]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return; // touch keeps native scroll
    drag.current = { x: e.clientX, y: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const el = viewportRef.current;
    if (!drag.current || !el) return;
    el.scrollLeft -= e.clientX - drag.current.x;
    el.scrollTop -= e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY };
  };
  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="tree-canvas">
      <div
        ref={viewportRef}
        className="tree-canvas-viewport"
        style={{ height: VIEWPORT_H }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="tree-canvas-scene"
          style={{ width: layout.width * k, height: layout.height * k }}
        >
          <svg
            width={layout.width}
            height={layout.height}
            viewBox={`0 0 ${layout.width} ${layout.height}`}
            style={{ transform: `scale(${k})`, transformOrigin: "0 0" }}
            role="img"
            aria-label={`Family tree, ${layout.nodes.length} people`}
          >
            <TreeSvgLayer layout={layout} />
          </svg>
        </div>
      </div>

      <div className="tree-canvas-controls" aria-hidden="true">
        <button type="button" onClick={() => zoomAt(1.25)} title="Zoom in">
          +
        </button>
        <button type="button" onClick={() => zoomAt(0.8)} title="Zoom out">
          −
        </button>
        <button
          type="button"
          onClick={() => {
            setK(1);
            viewportRef.current?.scrollTo({ left: 0, top: 0 });
          }}
          title="Reset view"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
