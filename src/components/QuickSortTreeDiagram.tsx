import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Maximize2, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { QuickSortTreeViewer, type QuickSortTreeViewerApi } from '@/components/QuickSortTreeViewer';
import type { QuickNode } from '@/lib/algorithms/sorting/buildQuickSortTree';

type Props = {
  root: QuickNode;
  sortedValues: number[];
  autoOpenFullscreen?: boolean;
  onAutoOpenConsumed?: () => void;
};

const PALETTE = {
  blue: '#4F8DFF',
  amber: '#F5C451',
  green: '#3DDC84',
  edgeBlue: '#6FA4FF',
  edgeAmber: '#FFD166',
  edgeGreen: '#5AF0A0',
  bg: '#0B1220',
  nodeFill: '#101A2F',
  chipBg: '#FFFFFF',
  chipText: '#0B1220',
  chrome: 'rgba(148,163,184,0.35)',
  pivot: '#D946EF',
} as const;

type Bounds = { minX: number; minY: number; maxX: number; maxY: number };

type Edge = {
  fromId: string;
  toId: string;
  kind: 'partition';
  side: 'left' | 'right';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  cx1: number;
  cy1: number;
  cx2: number;
  cy2: number;
};

type PlacedNode = {
  id: string;
  kind: 'root' | 'partition' | 'leaf' | 'sorted';
  values: number[];
  pivotValue: number;
  leftValues: number[];
  rightValues: number[];
  cx: number;
  topRowX: number;
  topRowY: number;
  topRowW: number;
  partitionY: number;
  partitionW: number;
  leftRowX: number;
  leftRowW: number;
  pivotBoxX: number;
  rightRowX: number;
  rightRowW: number;
  nodeX: number; // node bbox top-left
  nodeY: number; // node bbox top-left
  nodeW: number; // node bbox width
  nodeH: number; // node bbox height
};

const SORTED_NODE_ID = '__quick_sorted__';

type RevealStep = {
  id: string;
  kind: 'phase1' | 'phase2' | 'phase3' | 'final';
  focusNodeId: string;
  nodesToShow: string[];
  edgesToShow: string[];
  phaseToSet?: Array<{ nodeId: string; phase: 1 | 2 | 3 }>;
  message: string;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const edgeKey = (fromId: string, toId: string) => `${fromId}->${toId}`;

function buildQuickRevealTimeline(root: QuickNode, sortedNodeId: string): RevealStep[] {
  const steps: RevealStep[] = [];
  const shownNodes = new Set<string>();
  const shownEdges = new Set<string>();

  const ensure = (id: string, set: Set<string>, out: string[]) => {
    if (set.has(id)) return;
    set.add(id);
    out.push(id);
  };

  const walk = (n: QuickNode, parent: QuickNode | null) => {
    const pivot = n.pivotValue;
    const isPartitionable = n.values.length > 1;

    // Step 1: show subarray row + highlight last element pivot.
    const nodesToShow: string[] = [];
    ensure(n.id, shownNodes, nodesToShow);

    const edgesToShow: string[] = [];
    if (parent) {
      const ek = edgeKey(parent.id, n.id);
      if (!shownEdges.has(ek)) {
        shownEdges.add(ek);
        edgesToShow.push(ek);
      }
    }

    steps.push({
      id: `phase1:${n.id}`,
      kind: 'phase1',
      focusNodeId: n.id,
      nodesToShow,
      edgesToShow,
      phaseToSet: [{ nodeId: n.id, phase: 1 }],
      message: isPartitionable ? `Choose pivot (last element) = ${pivot}` : 'Single element is already sorted',
    });

    if (isPartitionable) {
      // Step 2: reveal center pivot block + two split arrows + labels (pivot final position).
      steps.push({
        id: `phase2:${n.id}`,
        kind: 'phase2',
        focusNodeId: n.id,
        nodesToShow: [],
        edgesToShow: [],
        phaseToSet: [{ nodeId: n.id, phase: 2 }],
        message: `Partition into <= ${pivot} (left) and > ${pivot} (right). Pivot ${pivot} is in its final position`,
      });

      // Step 3: reveal left/right results and show recursion targets (or empty sides).
      const childrenToShow: string[] = [];
      const childEdgesToShow: string[] = [];
      if (n.left) {
        ensure(n.left.id, shownNodes, childrenToShow);
        const ek = edgeKey(n.id, n.left.id);
        if (!shownEdges.has(ek)) {
          shownEdges.add(ek);
          childEdgesToShow.push(ek);
        }
      }
      if (n.right) {
        ensure(n.right.id, shownNodes, childrenToShow);
        const ek = edgeKey(n.id, n.right.id);
        if (!shownEdges.has(ek)) {
          shownEdges.add(ek);
          childEdgesToShow.push(ek);
        }
      }

      const emptyNotes: string[] = [];
      if (n.leftValues.length === 0) emptyNotes.push('Left side is empty → no recursion');
      if (n.rightValues.length === 0) emptyNotes.push('Right side is empty → no recursion');
      const suffix = emptyNotes.length ? ` (${emptyNotes.join(' • ')})` : '';

      steps.push({
        id: `phase3:${n.id}`,
        kind: 'phase3',
        focusNodeId: n.id,
        nodesToShow: childrenToShow,
        edgesToShow: childEdgesToShow,
        phaseToSet: [{ nodeId: n.id, phase: 3 }],
        message: `Pivot ${pivot} is fixed; recurse left and right${suffix}`,
      });
    }

    if (n.left) walk(n.left, n);
    if (n.right) walk(n.right, n);
  };

  walk(root, null);

  // Final mandatory step: show the full Sorted row.
  if (!shownNodes.has(sortedNodeId)) {
    steps.push({
      id: `sorted:${sortedNodeId}`,
      kind: 'final',
      focusNodeId: sortedNodeId,
      nodesToShow: [sortedNodeId],
      edgesToShow: [],
      message: 'Sorted complete: final array is ready.',
    });
  }
  return steps;
}

export const QuickSortTreeDiagram: React.FC<Props> = ({ root, sortedValues, autoOpenFullscreen, onAutoOpenConsumed }) => {
  const [isFull, setIsFull] = useState(false);
  const [hoverActiveNodeId, setHoverActiveNodeId] = useState<string | null>(null);

  const [mode, setMode] = useState<'static' | 'animated'>('static');
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSpeed, setRecordSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [includeNarrationOverlay, setIncludeNarrationOverlay] = useState(true);
  const recordAbortRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);

  const fullApiRef = useRef<QuickSortTreeViewerApi | null>(null);

  // Auto-open fullscreen from the outside ("Show Quick Sort Tree" button).
  useEffect(() => {
    if (!autoOpenFullscreen) return;
    setIsFull(true);
    onAutoOpenConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoOpenFullscreen]);

  const layout = useMemo(() => {
    const isMobile = false;

    const cellW = isMobile ? 42 : 56;
    const cellH = isMobile ? 42 : 56;
    const cellGap = isMobile ? 6 : 8;

    const rowStroke = isMobile ? 2.6 : 2.85;
    const splitGapY = isMobile ? 48 : 56;
    const baseChildGapY = isMobile ? 64 : 76;
    const midGap = isMobile ? 16 : 22;
    const labelH = isMobile ? 18 : 22;

    const sidePad = isMobile ? 24 : 64;
    const topPad = isMobile ? 44 : 72;
    const labelPadRight = isMobile ? 120 : 160;

    const rowW = (count: number) => {
      const c = Math.max(0, count);
      if (c <= 0) return 0;
      return c * cellW + (c - 1) * cellGap;
    };

    const emptySlotW = cellW + 34; // spacing budget for an empty side so chains don't become vertical

    type LayoutNode = {
      n: QuickNode;
      topRowW: number;
      leftRowW: number;
      rightRowW: number;
      partitionW: number;
      nodeW: number;
      nodeH: number;
      subtreeW: number;
      left?: LayoutNode;
      right?: LayoutNode;
    };

    const gapXAtDepth = (depth: number) => {
      const base = isMobile ? 46 : 64;
      const factor = Math.pow(0.9, Math.min(6, depth));
      return Math.round(base * factor);
    };

    const gapYAtDepth = (depth: number) => {
      const factor = Math.pow(0.92, Math.min(8, depth));
      return Math.round(baseChildGapY * factor);
    };

    const computeLayout = (n: QuickNode): LayoutNode => {
      const isPartitionable = n.values.length > 1;

      const topRowW = rowW(Math.max(1, n.values.length));

      // For empty partitions, reserve a small placeholder width (dashed "Empty") so the node doesn't collapse.
      const leftRowW = isPartitionable ? (n.leftValues.length > 0 ? rowW(n.leftValues.length) : cellW) : 0;
      const rightRowW = isPartitionable ? (n.rightValues.length > 0 ? rowW(n.rightValues.length) : cellW) : 0;
      const partitionW = isPartitionable ? leftRowW + midGap + cellW + midGap + rightRowW : 0;
      const nodeW = Math.max(topRowW, partitionW);

      const nodeH = isPartitionable ? labelH + cellH + splitGapY + cellH + 16 : labelH + cellH + 18;

      const left = n.left ? computeLayout(n.left) : undefined;
      const right = n.right ? computeLayout(n.right) : undefined;

      const gapX0 = gapXAtDepth(0);
      const leftSubW = left?.subtreeW ?? (isPartitionable ? emptySlotW : 0);
      const rightSubW = right?.subtreeW ?? (isPartitionable ? emptySlotW : 0);

      const childrenW = isPartitionable ? leftSubW + gapX0 + rightSubW : 0;
      const subtreeW = Math.max(nodeW, childrenW);

      return { n, topRowW, leftRowW, rightRowW, partitionW, nodeW, nodeH, subtreeW, left, right };
    };

    const rootLayout = computeLayout(root);

    const placed: PlacedNode[] = [];

    const place = (ln: LayoutNode, centerX: number, topY: number, depth: number) => {
      const n = ln.n;
      const isPartitionable = n.values.length > 1;

      const topRowY = topY + labelH;
      const topRowX = Math.round(centerX - ln.topRowW / 2);

      const partitionY = Math.round(topRowY + cellH + splitGapY);
      const partitionStartX = Math.round(centerX - ln.partitionW / 2);
      const leftRowX = partitionStartX;
      const pivotBoxX = Math.round(partitionStartX + ln.leftRowW + midGap);
      const rightRowX = Math.round(pivotBoxX + cellW + midGap);

      const nodeX = Math.min(topRowX, partitionStartX) - 16;
      const nodeY = topY;
      const nodeW = Math.max(topRowX + ln.topRowW, partitionStartX + ln.partitionW) - nodeX + 16;
      const nodeH = ln.nodeH;

      placed.push({
        id: n.id,
        kind: n.kind,
        values: n.values,
        pivotValue: n.pivotValue,
        leftValues: n.leftValues,
        rightValues: n.rightValues,
        cx: Math.round(centerX),
        topRowX,
        topRowY: Math.round(topRowY),
        topRowW: Math.round(ln.topRowW),
        partitionY,
        partitionW: Math.round(ln.partitionW),
        leftRowX: Math.round(leftRowX),
        leftRowW: Math.round(ln.leftRowW),
        pivotBoxX,
        rightRowX: Math.round(rightRowX),
        rightRowW: Math.round(ln.rightRowW),
        nodeX: Math.round(nodeX),
        nodeY: Math.round(nodeY),
        nodeW: Math.round(nodeW),
        nodeH: Math.round(nodeH),
      });

      if (!isPartitionable) return;

      const nextTopY = Math.round(topY + nodeH + gapYAtDepth(depth));

      const gapX = gapXAtDepth(depth);
      const leftSubW = ln.left?.subtreeW ?? emptySlotW;
      const rightSubW = ln.right?.subtreeW ?? emptySlotW;
      const d = leftSubW / 2 + gapX + rightSubW / 2;
      const leftCenter = Math.round(centerX - d / 2);
      const rightCenter = Math.round(centerX + d / 2);

      if (ln.left) place(ln.left, leftCenter, nextTopY, depth + 1);
      if (ln.right) place(ln.right, rightCenter, nextTopY, depth + 1);
    };

    // Root centered and padded.
    const rootCenter = sidePad + rootLayout.subtreeW / 2;
    place(rootLayout, rootCenter, topPad, 0);

    // Build edges after placement (uses placed-node coordinates).
    const byId = new Map<string, PlacedNode>();
    for (const p of placed) byId.set(p.id, p);

    const edges: Edge[] = [];
    const walkEdges = (n: QuickNode) => {
      const pn = byId.get(n.id);
      if (!pn) return;
      const isPartitionable = n.values.length > 1;
      if (isPartitionable && n.left) {
        const cn = byId.get(n.left.id);
        if (cn) {
          const x1 = Math.round(pn.leftRowX + pn.leftRowW / 2);
          const y1 = Math.round(pn.partitionY + cellH + 6);
          const x2 = Math.round(cn.cx);
          const y2 = Math.round(cn.topRowY - 8);
          const midY = Math.round(y1 + (y2 - y1) * 0.55);
          edges.push({
            fromId: n.id,
            toId: n.left.id,
            kind: 'partition',
            side: 'left',
            x1,
            y1,
            x2,
            y2,
            cx1: x1,
            cy1: midY,
            cx2: x2,
            cy2: midY,
          });
        }
      }
      if (isPartitionable && n.right) {
        const cn = byId.get(n.right.id);
        if (cn) {
          const x1 = Math.round(pn.rightRowX + pn.rightRowW / 2);
          const y1 = Math.round(pn.partitionY + cellH + 6);
          const x2 = Math.round(cn.cx);
          const y2 = Math.round(cn.topRowY - 8);
          const midY = Math.round(y1 + (y2 - y1) * 0.55);
          edges.push({
            fromId: n.id,
            toId: n.right.id,
            kind: 'partition',
            side: 'right',
            x1,
            y1,
            x2,
            y2,
            cx1: x1,
            cy1: midY,
            cx2: x2,
            cy2: midY,
          });
        }
      }
      if (n.left) walkEdges(n.left);
      if (n.right) walkEdges(n.right);
    };
    walkEdges(root);

    const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    const include = (minX: number, minY: number, maxX: number, maxY: number) => {
      bounds.minX = Math.min(bounds.minX, minX);
      bounds.minY = Math.min(bounds.minY, minY);
      bounds.maxX = Math.max(bounds.maxX, maxX);
      bounds.maxY = Math.max(bounds.maxY, maxY);
    };

    for (const n of placed) {
      include(n.nodeX, n.nodeY, n.nodeX + n.nodeW + labelPadRight, n.nodeY + n.nodeH);
      // Extra headroom for the top-row Pivot label.
      include(n.topRowX, n.topRowY - 34, n.topRowX + n.topRowW, n.topRowY + cellH);
    }
    for (const e of edges) {
      include(Math.min(e.x1, e.x2), Math.min(e.y1, e.y2), Math.max(e.x1, e.x2), Math.max(e.y1, e.y2));
    }

    // Mandatory final "Sorted" row at the bottom (Static always; Animated final step only).
    const finalValues = sortedValues.length ? sortedValues : root.values;
    const finalW = rowW(finalValues.length);
    const finalCenter = rootCenter;
    const finalTopRowX = Math.round(finalCenter - finalW / 2);
    const finalTopRowY = Math.round(bounds.maxY + (isMobile ? 92 : 124));
    const finalNode: PlacedNode = {
      id: SORTED_NODE_ID,
      kind: 'sorted',
      values: finalValues.length ? finalValues : [0],
      pivotValue: 0,
      leftValues: [],
      rightValues: [],
      cx: Math.round(finalCenter),
      topRowX: finalTopRowX,
      topRowY: finalTopRowY,
      topRowW: Math.round(finalW),
      partitionY: finalTopRowY,
      partitionW: 0,
      leftRowX: finalTopRowX,
      leftRowW: 0,
      pivotBoxX: finalTopRowX,
      rightRowX: finalTopRowX,
      rightRowW: 0,
      nodeX: finalTopRowX - 16,
      nodeY: finalTopRowY - 44,
      nodeW: Math.round(finalW + 32),
      nodeH: Math.round(cellH + 72),
    };
    placed.push(finalNode);
    include(finalNode.nodeX, finalNode.nodeY, finalNode.nodeX + finalNode.nodeW + labelPadRight, finalNode.nodeY + finalNode.nodeH);

    const pad = isMobile ? 24 : 64;
    const contentWidth = Math.max(1, Math.ceil(bounds.maxX + pad));
    const contentHeight = Math.max(1, Math.ceil(bounds.maxY + pad));

    return {
      cellW,
      cellH,
      cellGap,
      rowStroke,
      splitGapY,
      midGap,
      labelH,
      contentWidth,
      contentHeight,
      nodes: placed,
      edges,
      bounds,
    };
  }, [root, sortedValues]);

  const revealTimeline = useMemo(() => buildQuickRevealTimeline(root, SORTED_NODE_ID), [root]);

  const rootId = root.id;
  const [revealCursor, setRevealCursor] = useState(0);

  const resetRevealState = () => {
    setRevealCursor(0);
  };

  const revealState = useMemo(() => {
    const nodes = new Set<string>([rootId]);
    const edges = new Set<string>();
    const phases = new Map<string, 0 | 1 | 2 | 3>();
    phases.set(rootId, 1);

    let focusNodeId = rootId;
    let message = 'Starting Quick Sort: original array';

    const upto = Math.min(revealCursor, revealTimeline.length);
    for (let i = 0; i < upto; i++) {
      const step = revealTimeline[i];
      if (!step) continue;
      focusNodeId = step.focusNodeId;
      message = step.message;
      for (const id of step.nodesToShow) nodes.add(id);
      for (const id of step.edgesToShow) edges.add(id);
      for (const upd of step.phaseToSet ?? []) {
        const prev = phases.get(upd.nodeId) ?? 0;
        phases.set(upd.nodeId, Math.max(prev, upd.phase) as any);
      }
    }

    return { nodes, edges, phases, focusNodeId, message };
  }, [revealCursor, revealTimeline, rootId]);

  const revealNext = () => setRevealCursor((v) => Math.min(revealTimeline.length, v + 1));
  const revealPrev = () => setRevealCursor((v) => Math.max(0, v - 1));

  // Stable playback loop (fullscreen only).
  useEffect(() => {
    if (!isFull) return;
    if (mode !== 'animated') return;
    if (!isPlaying) return;
    if (revealTimeline.length <= 0) return;
    if (revealCursor >= revealTimeline.length) {
      setIsPlaying(false);
      return;
    }

    const id = window.setTimeout(() => {
      revealNext();
    }, speedMs);

    return () => window.clearTimeout(id);
  }, [isFull, isPlaying, mode, speedMs, revealCursor, revealTimeline.length]);

  // Autoplay remains OFF by default; only runs when toggled.
  useEffect(() => {
    if (!isFull) return;
    if (mode !== 'animated') return;
    if (!autoplay) return;
    if (isPlaying) return;
    if (revealCursor >= revealTimeline.length) return;
    setIsPlaying(true);
  }, [autoplay, isFull, isPlaying, mode, revealCursor, revealTimeline.length]);

  // Reset player state when closing fullscreen.
  useLayoutEffect(() => {
    if (isFull) return;
    setIsPlaying(false);
    setMode('static');
    resetRevealState();
  }, [isFull]);

  // Reset reveal state on root change.
  useEffect(() => {
    resetRevealState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

  const activeNodeId = useMemo(() => {
    if (mode === 'animated' && isFull) return revealState.focusNodeId;
    return hoverActiveNodeId;
  }, [hoverActiveNodeId, isFull, mode, revealState.focusNodeId]);

  const active = useMemo(() => {
    const nodes = new Set<string>();
    const edges = new Set<string>();
    if (!activeNodeId) return { nodes, edges };

    const parents = new Map<string, string[]>();
    for (const e of layout.edges) {
      const k = e.toId;
      const list = parents.get(k);
      if (list) list.push(e.fromId);
      else parents.set(k, [e.fromId]);
    }

    const visit = (id: string) => {
      if (nodes.has(id)) return;
      nodes.add(id);
      const ps = parents.get(id);
      if (!ps) return;
      for (const p of ps) {
        edges.add(`${p}->${id}`);
        visit(p);
      }
    };

    visit(activeNodeId);
    return { nodes, edges };
  }, [activeNodeId, layout.edges]);

  const showAll = !(mode === 'animated' && isFull);

  const isNodeVisible = (nodeId: string) => showAll || revealState.nodes.has(nodeId);
  const isEdgeVisible = (edgeId: string) => showAll || revealState.edges.has(edgeId);
  const getNodePhase = (n: PlacedNode): 0 | 1 | 2 | 3 => {
    if (showAll) {
      if (n.kind === 'leaf' || n.kind === 'sorted') return 1;
      return 3;
    }
    return (revealState.phases.get(n.id) ?? 0) as any;
  };

  const CELL = useMemo(
    () => ({
      blue: PALETTE.blue,
      pivot: PALETTE.amber,
      textOnBlue: '#F8FAFC',
      textOnPivot: '#F8FAFC',
      stroke: 'rgba(0,0,0,0.32)',
    }),
    [],
  );

  const renderCell = (x: number, y: number, w: number, h: number, fill: string, stroke: string, strokeWidth: number, rx: number) => {
    return (
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={rx}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
    );
  };

  const renderBlock = (x: number, y: number, fill: string, stroke: string, strokeWidth: number) => {
    const w = layout.cellW;
    const h = layout.cellH;
    const rx = 12;
    const shadowDx = 2;
    const shadowDy = 2;
    return (
      <g>
        {/* Very subtle shadow with no blur */}
        {renderCell(x + shadowDx, y + shadowDy, w, h, 'rgba(0,0,0,0.25)', 'rgba(0,0,0,0)', 0, rx)}
        {renderCell(x, y, w, h, fill, stroke, strokeWidth, rx)}
      </g>
    );
  };

  const renderBlockFlat = (x: number, y: number, fill: string, stroke: string, strokeWidth: number) => {
    const w = layout.cellW;
    const h = layout.cellH;
    const rx = 12;
    return renderCell(x, y, w, h, fill, stroke, strokeWidth, rx);
  };

  const pillMetrics = (text: string) => {
    // Simple width estimate for a bold 12px label.
    const w = Math.max(44, Math.round(16 + text.length * 7.4));
    const h = 20;
    return { w, h };
  };

  const renderPill = (cx: number, cy: number, text: string) => {
    const { w, h } = pillMetrics(text);
    return (
      <g transform={`translate(${Math.round(cx)}, ${Math.round(cy)})`}>
        <rect
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={10}
          fill={'#0B1220'}
          stroke={'rgba(255,255,255,0.18)'}
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <text
          x={0}
          y={1}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={800}
          fill={'rgba(248,250,252,0.98)'}
          style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
        >
          {text}
        </text>
      </g>
    );
  };

  const labelAnchorForSegment = (x1: number, y1: number, x2: number, y2: number, offset: number) => {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.max(0.001, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    return { x: mx + nx * offset, y: my + ny * offset };
  };

  const DiagramScene = (
    <svg
      className="merge-tree-crisp block"
      width={layout.contentWidth}
      height={layout.contentHeight}
      viewBox={`0 0 ${layout.contentWidth} ${layout.contentHeight}`}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      vectorEffect="non-scaling-stroke"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="quick-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070B12" />
          <stop offset="100%" stopColor={PALETTE.bg} />
        </linearGradient>

        <marker id="arrow-blue" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={PALETTE.edgeBlue} vectorEffect="non-scaling-stroke" />
        </marker>
        <marker id="arrow-amber" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto">
          <path d="M0,0 L10,5 L0,10 z" fill={PALETTE.edgeAmber} vectorEffect="non-scaling-stroke" />
        </marker>
      </defs>

      <rect x={0} y={0} width={layout.contentWidth} height={layout.contentHeight} fill="url(#quick-bg)" />

      {layout.edges.map((e, idx) => {
        const k = edgeKey(e.fromId, e.toId);
        if (!isEdgeVisible(k)) return null;
        const isActive = active.edges.has(k);
        const baseW = 2.8;
        return (
          <path
            key={`${e.fromId}-${e.toId}-${idx}`}
            d={`M ${e.x1} ${e.y1} C ${e.cx1} ${e.cy1}, ${e.cx2} ${e.cy2}, ${e.x2} ${e.y2}`}
            fill="none"
            stroke={PALETTE.edgeBlue}
            strokeWidth={isActive ? baseW + 0.5 : baseW}
            markerEnd="url(#arrow-blue)"
            vectorEffect="non-scaling-stroke"
            opacity={0.98}
            style={{ transition: 'stroke-width 180ms ease' }}
          />
        );
      })}

      {layout.nodes.map((n) => {
        if (!isNodeVisible(n.id)) return null;

        const isSortedRow = n.id === SORTED_NODE_ID || n.kind === 'sorted';
        const isPartitionable = !isSortedRow && n.values.length > 1;
        const phase = getNodePhase(n);

        const step = layout.cellW + layout.cellGap;
        const values = n.values.length ? n.values : [0];
        const pivotIndex = Math.max(0, values.length - 1);

        const pivotCellX = n.topRowX + pivotIndex * step;
        const pivotCellCx = pivotCellX + layout.cellW / 2;
        const topRowBottomY = n.topRowY + layout.cellH;

        const leftAnchorX = n.leftRowW > 0 ? n.leftRowX + n.leftRowW / 2 : n.pivotBoxX - layout.midGap / 2;
        const rightAnchorX = n.rightRowW > 0 ? n.rightRowX + n.rightRowW / 2 : n.pivotBoxX + layout.cellW + layout.midGap / 2;

        const showSplit = isPartitionable && phase >= 2;
        const showPartitions = isPartitionable && phase >= 3;
        const showPivotHighlight = isPartitionable && phase >= 1;
        const pivotFixed = isPartitionable && phase >= 2;

        const isFinalSortedHighlight =
          (mode === 'animated' && isFull && revealCursor >= revealTimeline.length && isSortedRow) || (mode === 'static' && isSortedRow);

        return (
          <g
            key={n.id}
            onMouseEnter={() => setHoverActiveNodeId(n.id)}
            onMouseLeave={() => setHoverActiveNodeId(null)}
          >
            {/* Base case badge */}
            {!isSortedRow && !isPartitionable && values.length === 1 && (
              <g>
                {(() => {
                  const cx = n.topRowX + 18;
                  const cy = n.topRowY - 16;
                  return (
                    <g>
                      <rect
                        x={cx - 30}
                        y={cy - 10}
                        width={76}
                        height={20}
                        rx={10}
                        fill={'#0B1220'}
                        stroke={'rgba(90,240,160,0.7)'}
                        strokeWidth={1.2}
                        vectorEffect="non-scaling-stroke"
                      />
                      <circle cx={cx - 18} cy={cy} r={5} fill={PALETTE.green} />
                      <text
                        x={cx - 8}
                        y={cy + 1}
                        textAnchor="start"
                        dominantBaseline="middle"
                        fontSize={12}
                        fontWeight={900}
                        fill={'rgba(248,250,252,0.98)'}
                        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                      >
                        Sorted
                      </text>
                    </g>
                  );
                })()}
              </g>
            )}

            {/* Sorted section */}
            {isSortedRow && (
              <g>
                <g transform={`translate(${n.topRowX}, ${n.topRowY - 44})`}>
                  <rect
                    x={0}
                    y={0}
                    width={92}
                    height={24}
                    rx={999}
                    fill={PALETTE.chipBg}
                    stroke={'rgba(15,23,42,0.22)'}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle cx={12} cy={12} r={7} fill={PALETTE.green} />
                  <path
                    d="M 9 12 L 11.5 14.5 L 16.8 9.2"
                    fill="none"
                    stroke="#0B1220"
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={24}
                    y={12}
                    textAnchor="start"
                    dominantBaseline="middle"
                    fontSize={12}
                    fontWeight={900}
                    fill={PALETTE.chipText}
                    style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}
                  >
                    Sorted
                  </text>
                </g>

                <rect
                  x={n.topRowX - 16}
                  y={n.topRowY - 16}
                  width={n.topRowW + 32}
                  height={layout.cellH + 32}
                  rx={16}
                  fill={'rgba(0,0,0,0.10)'}
                  stroke={PALETTE.green}
                  strokeWidth={isFinalSortedHighlight ? 3.1 : 2.2}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}

            {/* Top row (subarray) */}
            {values.map((v, i) => {
              const x = n.topRowX + i * step;
              const isPivot = isPartitionable && i === pivotIndex;
              const fill = isPivot && showPivotHighlight ? CELL.pivot : CELL.blue;
              const stroke = isPivot && showPivotHighlight ? PALETTE.edgeAmber : 'rgba(0,0,0,0.35)';
              const strokeW = isPivot && showPivotHighlight ? 3.0 : 1.6;
              const textFill = isPivot && showPivotHighlight ? CELL.textOnPivot : CELL.textOnBlue;
              return (
                <g key={`${n.id}-top-${i}`}>
                  {/* Final sorted row must be strictly flat (no shadows). */}
                  {isSortedRow ? renderBlockFlat(x, n.topRowY, CELL.blue, 'rgba(0,0,0,0.35)', 1.6) : renderBlock(x, n.topRowY, fill, stroke, strokeW)}
                  <text
                    x={x + layout.cellW / 2}
                    y={n.topRowY + layout.cellH / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={isSortedRow ? 24 : 22}
                    fontWeight={isSortedRow ? 900 : 800}
                    fill={textFill}
                    style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                  >
                    {v}
                  </text>
                </g>
              );
            })}

            {/* Pivot label above last element (top row) */}
            {isPartitionable && showPivotHighlight && renderPill(pivotCellCx, n.topRowY - 16, 'Pivot')}

            {/* Split arrows + center pivot box */}
            {showSplit && (() => {
              const startX = pivotCellCx;
              const startY = topRowBottomY + 10;
              const endY = n.partitionY - 12;
              const leftX = Math.round(leftAnchorX);
              const rightX = Math.round(rightAnchorX);
              const ctrlY = Math.round(startY + (endY - startY) * 0.45);

              const leftLabelText = `<= ${n.pivotValue}`;
              const rightLabelText = `> ${n.pivotValue}`;

              const leftLabel = labelAnchorForSegment(startX, startY, leftX, endY, -16);
              const rightLabel = labelAnchorForSegment(startX, startY, rightX, endY, -16);

              // Collision avoidance vs top row: keep comparison labels above the top row.
              const leftMh = pillMetrics(leftLabelText).h;
              const rightMh = pillMetrics(rightLabelText).h;
              const minY = n.topRowY - 8 - leftMh;
              const minY2 = n.topRowY - 8 - rightMh;

              const leftLy = Math.min(leftLabel.y, minY);
              const rightLy = Math.min(rightLabel.y, minY2);

              return (
                <g>
                  {/* Lines first */}
                  <path
                    d={`M ${startX} ${startY} C ${startX} ${ctrlY}, ${leftX} ${ctrlY}, ${leftX} ${endY}`}
                    fill="none"
                    stroke={PALETTE.edgeAmber}
                    strokeWidth={layout.rowStroke}
                    markerEnd="url(#arrow-amber)"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={`M ${startX} ${startY} C ${startX} ${ctrlY}, ${rightX} ${ctrlY}, ${rightX} ${endY}`}
                    fill="none"
                    stroke={PALETTE.edgeAmber}
                    strokeWidth={layout.rowStroke}
                    markerEnd="url(#arrow-amber)"
                    vectorEffect="non-scaling-stroke"
                  />

                  {/* Center pivot box */}
                  {renderBlock(
                    n.pivotBoxX,
                    n.partitionY,
                    CELL.pivot,
                    pivotFixed ? PALETTE.green : PALETTE.edgeAmber,
                    pivotFixed ? 3.0 : 2.4,
                  )}

                  {/* Fixed indicator (check) */}
                  {pivotFixed && (
                    <g transform={`translate(${n.pivotBoxX + layout.cellW - 14}, ${n.partitionY + 12})`}>
                      <circle cx={0} cy={0} r={8} fill={PALETTE.green} />
                      <path
                        d="M -4 0 L -1 3 L 5 -4"
                        fill="none"
                        stroke="#0B1220"
                        strokeWidth={2.2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        vectorEffect="non-scaling-stroke"
                      />
                    </g>
                  )}

                  <text
                    x={n.pivotBoxX + layout.cellW / 2}
                    y={n.partitionY + layout.cellH / 2 + 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={22}
                    fontWeight={800}
                    fill={CELL.textOnPivot}
                    style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                  >
                    {n.pivotValue}
                  </text>

                  {/* Labels on arrows (pills rendered above lines) */}
                  {renderPill(leftLabel.x, leftLy, leftLabelText)}
                  {renderPill(rightLabel.x, rightLy, rightLabelText)}

                  {/* Center pivot label */}
                  {renderPill(n.pivotBoxX + layout.cellW / 2, n.partitionY - 16, 'Pivot')}
                </g>
              );
            })()}

            {/* Partition rows */}
            {showPartitions && (
              <g>
                {n.leftValues.length === 0 && (
                  <g>
                    <rect
                      x={n.leftRowX}
                      y={n.partitionY}
                      width={layout.cellW}
                      height={layout.cellH}
                      rx={12}
                      fill={'rgba(15,23,42,0.35)'}
                      stroke={'rgba(226,232,240,0.6)'}
                      strokeWidth={1.8}
                      strokeDasharray="6 5"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={n.leftRowX + layout.cellW / 2}
                      y={n.partitionY + layout.cellH / 2 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={800}
                      fill={'rgba(226,232,240,0.92)'}
                      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                    >
                      Empty
                    </text>
                  </g>
                )}

                {n.leftValues.map((v, i) => {
                  const x = n.leftRowX + i * step;
                  return (
                    <g key={`${n.id}-left-${i}`}>
                      {renderBlock(x, n.partitionY, CELL.blue, 'rgba(0,0,0,0.35)', 1.6)}
                      <text
                        x={x + layout.cellW / 2}
                        y={n.partitionY + layout.cellH / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={22}
                        fontWeight={800}
                        fill={CELL.textOnBlue}
                        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                      >
                        {v}
                      </text>
                    </g>
                  );
                })}

                {n.rightValues.length === 0 && (
                  <g>
                    <rect
                      x={n.rightRowX}
                      y={n.partitionY}
                      width={layout.cellW}
                      height={layout.cellH}
                      rx={12}
                      fill={'rgba(15,23,42,0.35)'}
                      stroke={'rgba(226,232,240,0.6)'}
                      strokeWidth={1.8}
                      strokeDasharray="6 5"
                      vectorEffect="non-scaling-stroke"
                    />
                    <text
                      x={n.rightRowX + layout.cellW / 2}
                      y={n.partitionY + layout.cellH / 2 + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={800}
                      fill={'rgba(226,232,240,0.92)'}
                      style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                    >
                      Empty
                    </text>
                  </g>
                )}

                {n.rightValues.map((v, i) => {
                  const x = n.rightRowX + i * step;
                  return (
                    <g key={`${n.id}-right-${i}`}>
                      {renderBlock(x, n.partitionY, CELL.blue, 'rgba(0,0,0,0.35)', 1.6)}
                      <text
                        x={x + layout.cellW / 2}
                        y={n.partitionY + layout.cellH / 2 + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={22}
                        fontWeight={800}
                        fill={CELL.textOnBlue}
                        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
                      >
                        {v}
                      </text>
                    </g>
                  );
                })}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );

  const INLINE_MIN_SCALE = 0.6;
  const INLINE_MAX_SCALE = 3.0;
  const INLINE_SOFT_MARGIN = 24;

  const inlineViewportRef = useRef<HTMLDivElement>(null);
  const [inlineViewportSize, setInlineViewportSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const inlinePanRef = useRef({
    isPanning: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragged: false,
  });

  type InlineTransform = { scale: number; ox: number; oy: number };
  const [inlineT, setInlineT] = useState<InlineTransform>({ scale: 1, ox: 0, oy: 0 });
  const didAutoFitRef = useRef(false);

  const getCenteredTranslate = (scale: number) => {
    const w = inlineViewportSize.w || layout.contentWidth;
    const h = inlineViewportSize.h || layout.contentHeight;
    const bw = Math.max(1, layout.bounds.maxX - layout.bounds.minX);
    const bh = Math.max(1, layout.bounds.maxY - layout.bounds.minY);
    const x = (w - bw * scale) / 2 - layout.bounds.minX * scale;
    const y = (h - bh * scale) / 2 - layout.bounds.minY * scale;
    return { x, y };
  };

  const clampInlineOffsets = (scale: number, ox: number, oy: number) => {
    const w = inlineViewportSize.w || layout.contentWidth;
    const h = inlineViewportSize.h || layout.contentHeight;
    const base = getCenteredTranslate(scale);

    const minX = layout.bounds.minX * scale + base.x;
    const maxX = layout.bounds.maxX * scale + base.x;
    const minY = layout.bounds.minY * scale + base.y;
    const maxY = layout.bounds.maxY * scale + base.y;

    const xMin = INLINE_SOFT_MARGIN - maxX;
    const xMax = w - INLINE_SOFT_MARGIN - minX;
    const yMin = INLINE_SOFT_MARGIN - maxY;
    const yMax = h - INLINE_SOFT_MARGIN - minY;

    const clampOrZero = (val: number, a: number, b: number) => {
      if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return 0;
      return clamp(val, a, b);
    };

    return { ox: clampOrZero(ox, xMin, xMax), oy: clampOrZero(oy, yMin, yMax) };
  };

  const getInlineFitScale = (padding: number) => {
    const w = inlineViewportSize.w || layout.contentWidth;
    const h = inlineViewportSize.h || layout.contentHeight;
    const bw = Math.max(1, layout.bounds.maxX - layout.bounds.minX);
    const bh = Math.max(1, layout.bounds.maxY - layout.bounds.minY);
    const targetW = Math.max(1, w - padding * 2);
    const targetH = Math.max(1, h - padding * 2);
    return clamp(Math.min(targetW / bw, targetH / bh), INLINE_MIN_SCALE, INLINE_MAX_SCALE);
  };

  const applyInlineFit = () => {
    const s = getInlineFitScale(28);
    setInlineT({ scale: s, ox: 0, oy: 0 });
  };

  const resetInline = () => {
    applyInlineFit();
  };

  useLayoutEffect(() => {
    const el = inlineViewportRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setInlineViewportSize({ w: entry.contentRect.width, h: entry.contentRect.height });
    });
    ro.observe(el);

    const rect = el.getBoundingClientRect();
    setInlineViewportSize({ w: rect.width, h: rect.height });

    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    didAutoFitRef.current = false;
    setHoverActiveNodeId(null);
  }, [root]);

  useLayoutEffect(() => {
    if (didAutoFitRef.current) return;
    if (!inlineViewportSize.w || !inlineViewportSize.h) return;
    applyInlineFit();
    didAutoFitRef.current = true;
  }, [inlineViewportSize.h, inlineViewportSize.w]);

  const inlineBase = getCenteredTranslate(inlineT.scale);

  const inlineViewBox = useMemo(() => {
    const vw = Math.max(1, inlineViewportSize.w || layout.contentWidth);
    const vh = Math.max(1, inlineViewportSize.h || layout.contentHeight);
    const s = Math.max(0.0001, inlineT.scale);

    const vbW = vw / s;
    const vbH = vh / s;

    let x = -(inlineBase.x + inlineT.ox) / s;
    let y = -(inlineBase.y + inlineT.oy) / s;

    const pad = 24;
    const minX = layout.bounds.minX - pad;
    const maxX = layout.bounds.maxX + pad - vbW;
    const minY = layout.bounds.minY - pad;
    const maxY = layout.bounds.maxY + pad - vbH;
    if (Number.isFinite(minX) && Number.isFinite(maxX) && maxX >= minX) x = clamp(x, minX, maxX);
    if (Number.isFinite(minY) && Number.isFinite(maxY) && maxY >= minY) y = clamp(y, minY, maxY);

    const xr = Number.isFinite(x) ? Math.round(x) : 0;
    const yr = Number.isFinite(y) ? Math.round(y) : 0;
    const fmt = (n: number) => (Math.round(n * 1000) / 1000).toString();
    return `${xr} ${yr} ${fmt(vbW)} ${fmt(vbH)}`;
  }, [
    inlineBase.x,
    inlineBase.y,
    inlineT.ox,
    inlineT.oy,
    inlineT.scale,
    inlineViewportSize.h,
    inlineViewportSize.w,
    layout.bounds.maxX,
    layout.bounds.maxY,
    layout.bounds.minX,
    layout.bounds.minY,
    layout.contentHeight,
    layout.contentWidth,
  ]);

  const zoomInlineAtPoint = (clientX: number, clientY: number, nextScale: number) => {
    const el = inlineViewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;

    setInlineT((prev) => {
      const ns = clamp(nextScale, INLINE_MIN_SCALE, INLINE_MAX_SCALE);
      const basePrev = getCenteredTranslate(prev.scale);
      const baseNext = getCenteredTranslate(ns);

      const worldX = (px - (basePrev.x + prev.ox)) / prev.scale;
      const worldY = (py - (basePrev.y + prev.oy)) / prev.scale;

      const ox = px - baseNext.x - worldX * ns;
      const oy = py - baseNext.y - worldY * ns;

      const clamped = clampInlineOffsets(ns, ox, oy);
      return { scale: ns, ...clamped };
    });
  };

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">Quick Sort Tree</div>
            <div className="text-[11px] text-muted-foreground">Partition recursion (pivot = last element)</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-blue-500/70" /> Element
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" /> Pivot
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Sorted
            </span>

            <button
              type="button"
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
              onClick={() => setIsFull(true)}
              aria-label="Open fullscreen"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="w-full">
          <div className="w-full flex items-center justify-center px-4 py-5">
            <div
              className="relative w-full max-w-[1200px] rounded-xl ring-1 ring-border bg-background transition-shadow hover:shadow-md cursor-zoom-in overflow-hidden"
              style={{ height: 'clamp(260px, 45vh, 520px)' }}
            >
              <div
                ref={inlineViewportRef}
                className="absolute inset-0 touch-none cursor-grab active:cursor-grabbing"
                onPointerDown={(e) => {
                  const el = inlineViewportRef.current;
                  if (!el) return;

                  inlinePanRef.current.isPanning = true;
                  inlinePanRef.current.pointerId = e.pointerId;
                  inlinePanRef.current.startX = e.clientX;
                  inlinePanRef.current.startY = e.clientY;
                  inlinePanRef.current.lastX = e.clientX;
                  inlinePanRef.current.lastY = e.clientY;
                  inlinePanRef.current.dragged = false;

                  el.setPointerCapture(e.pointerId);
                }}
                onPointerMove={(e) => {
                  const st = inlinePanRef.current;
                  if (!st.isPanning) return;
                  if (st.pointerId !== e.pointerId) return;

                  const dx = e.clientX - st.lastX;
                  const dy = e.clientY - st.lastY;
                  st.lastX = e.clientX;
                  st.lastY = e.clientY;

                  const totalDx = e.clientX - st.startX;
                  const totalDy = e.clientY - st.startY;
                  if (!st.dragged && Math.hypot(totalDx, totalDy) > 4) st.dragged = true;

                  setInlineT((prev) => {
                    const next = { scale: prev.scale, ox: prev.ox + dx, oy: prev.oy + dy };
                    const clamped = clampInlineOffsets(next.scale, next.ox, next.oy);
                    return { scale: next.scale, ...clamped };
                  });
                }}
                onPointerUp={(e) => {
                  const el = inlineViewportRef.current;
                  if (!el) return;
                  const st = inlinePanRef.current;
                  if (st.pointerId !== e.pointerId) return;
                  st.isPanning = false;
                  st.pointerId = null;
                  try {
                    el.releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                onPointerCancel={(e) => {
                  const el = inlineViewportRef.current;
                  if (!el) return;
                  const st = inlinePanRef.current;
                  if (st.pointerId !== e.pointerId) return;
                  st.isPanning = false;
                  st.pointerId = null;
                  try {
                    el.releasePointerCapture(e.pointerId);
                  } catch {
                    // ignore
                  }
                }}
                onWheel={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const direction = e.deltaY > 0 ? -1 : 1;
                    const factor = direction > 0 ? 1.06 : 0.94;
                    zoomInlineAtPoint(e.clientX, e.clientY, inlineT.scale * factor);
                    return;
                  }

                  if (inlineT.scale !== 1 || inlineT.ox !== 0 || inlineT.oy !== 0) {
                    e.preventDefault();
                    setInlineT((prev) => {
                      const next = { scale: prev.scale, ox: prev.ox - e.deltaX, oy: prev.oy - e.deltaY };
                      const clamped = clampInlineOffsets(next.scale, next.ox, next.oy);
                      return { scale: next.scale, ...clamped };
                    });
                  }
                }}
              >
                {React.cloneElement(DiagramScene as React.ReactElement, {
                  width: '100%',
                  height: '100%',
                  viewBox: inlineViewBox,
                  preserveAspectRatio: 'xMinYMin meet',
                  style: {
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    ...(DiagramScene as React.ReactElement).props?.style,
                  },
                })}
              </div>

              <div className="absolute right-2 top-2 flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 bg-background/90"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetInline();
                  }}
                  aria-label="Reset view"
                >
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="pointer-events-none absolute bottom-2 left-2 rounded-lg border border-border bg-background/70 px-2 py-1 text-[10px] text-muted-foreground shadow-sm">
                Ctrl/⌘ + scroll to zoom • Drag to pan • Double-click to reset
              </div>
            </div>
          </div>
        </div>
      </div>

      <QuickSortTreeViewer
        open={isFull}
        onOpenChange={setIsFull}
        title="Quick Sort Tree"
        subtitle="Drag to pan • Scroll to zoom • ESC to close"
        bounds={layout.bounds}
        fitPadding={56}
        sceneClassName=""
        apiRef={fullApiRef}
        interactionDisabled={isRecording}
        toolbarExtras={
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-border bg-card/50 p-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px]"
              onClick={async () => {
                const api = fullApiRef.current;
                if (!api) return;
                const svg = api.getSvgElement();
                if (!svg) return;

                const fitViewBox = api.getFitViewBox(56);
                const parts = fitViewBox.split(/\s+/).map((v) => Number(v));
                const vbW = Number.isFinite(parts[2]) ? parts[2] : svg.viewBox?.baseVal?.width || 0;
                const vbH = Number.isFinite(parts[3]) ? parts[3] : svg.viewBox?.baseVal?.height || 0;

                const clone = svg.cloneNode(true) as SVGSVGElement;
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
                clone.setAttribute('viewBox', fitViewBox);
                if (vbW) clone.setAttribute('width', `${vbW}`);
                if (vbH) clone.setAttribute('height', `${vbH}`);
                clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');

                const serialized = new XMLSerializer().serializeToString(clone);
                const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
                const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'quick-sort-tree.svg';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              }}
              aria-label="Export diagram as SVG"
            >
              Export SVG
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-[11px]"
              onClick={async () => {
                const api = fullApiRef.current;
                if (!api) return;
                const svg = api.getSvgElement();
                if (!svg) return;

                const fitViewBox = api.getFitViewBox(56);
                const parts = fitViewBox.split(/\s+/).map((v) => Number(v));
                const vbW = Number.isFinite(parts[2]) ? parts[2] : svg.viewBox?.baseVal?.width || 0;
                const vbH = Number.isFinite(parts[3]) ? parts[3] : svg.viewBox?.baseVal?.height || 0;
                if (!vbW || !vbH) return;

                const clone = svg.cloneNode(true) as SVGSVGElement;
                clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
                clone.setAttribute('viewBox', fitViewBox);
                clone.setAttribute('width', `${vbW}`);
                clone.setAttribute('height', `${vbH}`);
                clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');

                const serialized = new XMLSerializer().serializeToString(clone);
                const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
                const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                const url = URL.createObjectURL(svgBlob);

                const img = new Image();
                img.decoding = 'async';
                img.src = url;

                await new Promise<void>((resolve, reject) => {
                  img.onload = () => resolve();
                  img.onerror = () => reject(new Error('Failed to load SVG image'));
                });

                const scale = 3;
                const canvas = document.createElement('canvas');
                canvas.width = Math.ceil(vbW * scale);
                canvas.height = Math.ceil(vbH * scale);
                const ctx = canvas.getContext('2d');
                if (!ctx) {
                  URL.revokeObjectURL(url);
                  return;
                }
                ctx.imageSmoothingEnabled = true;
                if ('imageSmoothingQuality' in ctx) (ctx as any).imageSmoothingQuality = 'high';
                ctx.setTransform(scale, 0, 0, scale, 0, 0);
                ctx.fillStyle = '#070B12';
                ctx.fillRect(0, 0, vbW, vbH);
                ctx.drawImage(img, 0, 0, vbW, vbH);

                URL.revokeObjectURL(url);

                const pngBlob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
                if (!pngBlob) return;
                const pngUrl = URL.createObjectURL(pngBlob);
                const a = document.createElement('a');
                a.href = pngUrl;
                a.download = 'quick-sort-tree.png';
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(pngUrl);
              }}
              aria-label="Export diagram as high-resolution PNG"
            >
              Export PNG
            </Button>
          </div>
        }
        headerCenter={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMode('static');
                setIsPlaying(false);
                resetRevealState();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                mode === 'static'
                  ? 'bg-primary text-primary-foreground border-primary/60'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              }`}
            >
              Static View
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('animated');
                resetRevealState();
                setIsPlaying(false);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                mode === 'animated'
                  ? 'bg-primary text-primary-foreground border-primary/60'
                  : 'bg-card text-foreground border-border hover:bg-muted'
              }`}
            >
              Animated View
            </button>
          </div>
        }
        overlay={
          mode === 'animated' ? (
            <>
              <div className="pointer-events-auto absolute left-4 top-4 max-w-[560px] rounded-2xl border border-white/10 bg-[#0B1220] px-4 py-3 shadow-xl">
                <div className="text-xs font-semibold tracking-wide text-slate-200">
                  {(revealCursor <= 0 ? 'START' : revealTimeline[revealCursor - 1]?.kind?.toUpperCase()) ?? 'ANIMATION'}
                </div>
                <div className="mt-1 text-[12px] text-slate-300">
                  {revealState.message}
                </div>
                <div className="mt-2 text-[11px] text-slate-400">
                  Quick sort combines results as: left + pivot + right (not merge).
                </div>
              </div>

              <div className="pointer-events-auto absolute bottom-4 left-1/2 w-[min(980px,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-[#0B1220] px-4 py-3 shadow-xl">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          resetRevealState();
                          setIsPlaying(false);
                        }}
                        disabled={isRecording || revealTimeline.length === 0}
                      >
                        Restart
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsPlaying(false);
                          revealPrev();
                        }}
                        disabled={isRecording || revealCursor <= 0}
                      >
                        Prev
                      </Button>
                      <Button
                        variant={isPlaying ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => setIsPlaying((v) => !v)}
                        disabled={isRecording || revealTimeline.length <= 0}
                      >
                        {isPlaying ? 'Pause' : 'Play'}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setIsPlaying(false);
                          revealNext();
                        }}
                        disabled={isRecording || revealCursor >= revealTimeline.length}
                      >
                        Next
                      </Button>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={isRecording ? 'secondary' : 'default'}
                          size="sm"
                          onClick={async () => {
                            if (isRecording) {
                              recordAbortRef.current = true;
                              try {
                                recorderRef.current?.stop();
                              } catch {
                                // ignore
                              }
                              return;
                            }

                            const api = fullApiRef.current;
                            if (!api) return;

                            // Snapshot state to restore.
                            const snapMode = mode;
                            const snapCursor = revealCursor;

                            setIsPlaying(false);
                            if (snapMode !== 'animated') setMode('animated');
                            setRevealCursor(0);

                            recordAbortRef.current = false;
                            recordChunksRef.current = [];
                            setIsRecording(true);

                            const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
                            const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(() => r(), ms));

                            // Recording states are driven only by the cursor.
                            const states: Array<{ cursor: number; message: string }> = [];
                            states.push({ cursor: 0, message: 'Starting Quick Sort: original array' });
                            for (let i = 0; i < revealTimeline.length; i++) {
                              const step = revealTimeline[i];
                              states.push({ cursor: i + 1, message: step?.message ?? '' });
                            }

                            const fitViewBox = api.getFitViewBox(56);
                            const partsVB = fitViewBox.split(/\s+/).map((v) => Number(v));
                            const vbW = Number.isFinite(partsVB[2]) ? partsVB[2] : 0;
                            const vbH = Number.isFinite(partsVB[3]) ? partsVB[3] : 0;
                            if (!vbW || !vbH) {
                              setIsRecording(false);
                              return;
                            }

                            const canvas = document.createElement('canvas');
                            const renderScale = 2;
                            canvas.width = Math.ceil(vbW * renderScale);
                            canvas.height = Math.ceil(vbH * renderScale);
                            const ctx = canvas.getContext('2d');
                            if (!ctx) {
                              setIsRecording(false);
                              return;
                            }
                            ctx.imageSmoothingEnabled = true;
                            if ('imageSmoothingQuality' in ctx) (ctx as any).imageSmoothingQuality = 'high';
                            ctx.setTransform(renderScale, 0, 0, renderScale, 0, 0);

                            const stream = canvas.captureStream(30);
                            const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
                            const mimeType = mimeCandidates.find((m) => (window as any).MediaRecorder?.isTypeSupported?.(m)) ?? 'video/webm';
                            const rec = new MediaRecorder(stream, { mimeType });
                            recorderRef.current = rec;
                            rec.ondataavailable = (ev) => {
                              if (ev.data && ev.data.size > 0) recordChunksRef.current.push(ev.data);
                            };
                            rec.onstop = () => {
                              const blob = new Blob(recordChunksRef.current, { type: mimeType });
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = 'quick-sort-tree.webm';
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                              URL.revokeObjectURL(url);

                              recorderRef.current = null;
                              recordChunksRef.current = [];
                              setIsRecording(false);

                              // Restore snapshot.
                              setMode(snapMode);
                              setIsPlaying(false);
                              setRevealCursor(snapCursor);
                            };
                            rec.start();

                            for (let i = 0; i < states.length; i++) {
                              if (recordAbortRef.current) break;

                              const st = states[i];
                              setRevealCursor(st.cursor);

                              await nextFrame();
                              await nextFrame();

                              const svgEl = api.getSvgElement();
                              if (!svgEl) break;
                              const clone = svgEl.cloneNode(true) as SVGSVGElement;
                              clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
                              clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
                              clone.setAttribute('viewBox', fitViewBox);
                              clone.setAttribute('width', `${vbW}`);
                              clone.setAttribute('height', `${vbH}`);
                              clone.setAttribute('preserveAspectRatio', 'xMinYMin meet');

                              const serialized = new XMLSerializer().serializeToString(clone);
                              const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
                              const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
                              const url = URL.createObjectURL(svgBlob);
                              const img = new Image();
                              img.decoding = 'async';
                              img.src = url;
                              await new Promise<void>((resolve, reject) => {
                                img.onload = () => resolve();
                                img.onerror = () => reject(new Error('Failed to load SVG image'));
                              });

                              ctx.clearRect(0, 0, vbW, vbH);
                              ctx.fillStyle = '#070B12';
                              ctx.fillRect(0, 0, vbW, vbH);
                              ctx.drawImage(img, 0, 0, vbW, vbH);
                              URL.revokeObjectURL(url);

                              if (includeNarrationOverlay) {
                                const pad = 18;
                                const h = 54;
                                ctx.save();
                                ctx.globalAlpha = 0.9;
                                ctx.fillStyle = '#0B1220';
                                ctx.fillRect(pad, vbH - h - pad, vbW - pad * 2, h);
                                ctx.globalAlpha = 1;
                                ctx.strokeStyle = 'rgba(255,255,255,0.12)';
                                ctx.lineWidth = 1;
                                ctx.strokeRect(pad, vbH - h - pad, vbW - pad * 2, h);
                                ctx.fillStyle = 'rgba(226,232,240,0.95)';
                                ctx.font = '600 16px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial';
                                ctx.textBaseline = 'middle';
                                ctx.fillText(st.message, pad + 14, vbH - h / 2 - pad, vbW - pad * 2 - 28);
                                ctx.restore();
                              }

                              const effectiveMs = Math.max(140, Math.round(speedMs / recordSpeed));
                              await sleep(effectiveMs);
                            }

                            try {
                              rec.stop();
                            } catch {
                              // ignore
                            }
                          }}
                          disabled={revealTimeline.length <= 0}
                        >
                          {isRecording ? 'Stop' : 'Record'}
                        </Button>

                        <select
                          className="h-9 rounded-md border border-white/10 bg-[#0B1220] px-2 text-xs text-slate-200"
                          value={recordSpeed}
                          onChange={(e) => setRecordSpeed(Number(e.target.value) as any)}
                          disabled={isRecording}
                          aria-label="Record speed"
                        >
                          <option value={0.5}>0.5x</option>
                          <option value={1}>1x</option>
                          <option value={1.5}>1.5x</option>
                          <option value={2}>2x</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-slate-300">Autoplay</div>
                        <Switch checked={autoplay} onCheckedChange={(v) => setAutoplay(!!v)} disabled={isRecording} />
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="text-[11px] text-slate-300">Narration</div>
                        <Switch
                          checked={includeNarrationOverlay}
                          onCheckedChange={(v) => setIncludeNarrationOverlay(!!v)}
                          disabled={isRecording}
                        />
                      </div>

                      <div className="text-[11px] tabular-nums text-slate-300">
                        Step {Math.min(revealCursor + 1, revealTimeline.length + 1)} / {Math.max(1, revealTimeline.length + 1)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-[11px] text-slate-300 w-16">Speed</div>
                    <Slider
                      value={[speedMs]}
                      min={250}
                      max={1200}
                      step={50}
                      onValueChange={(v) => setSpeedMs(v[0] ?? 700)}
                      className="flex-1"
                      disabled={isRecording}
                    />
                    <div className="text-[11px] tabular-nums text-slate-300 w-16 text-right">{speedMs}ms</div>
                  </div>
                </div>
              </div>
            </>
          ) : null
        }
      >
        {DiagramScene}
      </QuickSortTreeViewer>
    </div>
  );
};
