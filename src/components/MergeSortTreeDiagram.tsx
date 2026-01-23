import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { TreeNode } from '@/lib/algorithms/sorting/buildMergeTree';
import { Maximize2, RefreshCcw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FullscreenTreeViewer, type FullscreenTreeViewerApi } from '@/components/FullscreenTreeViewer';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';

type Props = {
  root: TreeNode;
  activeNodeId?: string | null;
  dimOthers?: boolean;
};

type AnimStep = {
  id: string;
  kind: 'split' | 'leaf' | 'merge' | 'sorted';
  nodeId: string;
  message: string;
};

type RevealStep = {
  id: string;
  kind: 'split' | 'leaf' | 'merge' | 'sorted';
  focusNodeId: string;
  nodesToShow: string[];
  edgesToShow: string[];
  message: string;
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
} as const;

const edgeKey = (fromId: string, toId: string) => `${fromId}->${toId}`;

function buildRevealTimeline(root: TreeNode): RevealStep[] {
  const steps: RevealStep[] = [];

  const isLeaf = (n: TreeNode) => !n.left && !n.right;
  const isInternal = (n: TreeNode) => !!n.left && !!n.right;

  // We intentionally reveal leaf nodes during the leaf phase so Animated View is truly step-by-step.
  const deferredLeaves: Array<{ node: TreeNode; parent: TreeNode }> = [];

  const walkSplit = (n: TreeNode) => {
    if (!isInternal(n)) return;

    const nodesToShow: string[] = [];
    const edgesToShow: string[] = [];

    const addChild = (child: TreeNode | null) => {
      if (!child) return;
      const from = `${n.id}:s`;
      const to = `${child.id}:s`;

      if (isLeaf(child)) {
        deferredLeaves.push({ node: child, parent: n });
        // Connectors appear when the leaf appears.
        return;
      }

      nodesToShow.push(to);
      edgesToShow.push(edgeKey(from, to));
    };

    addChild(n.left ?? null);
    addChild(n.right ?? null);

    if (nodesToShow.length || edgesToShow.length) {
      steps.push({
        id: `split:${n.id}`,
        kind: 'split',
        focusNodeId: `${n.id}:s`,
        nodesToShow,
        edgesToShow,
        message: n === root ? 'Splitting: dividing the original array into halves' : 'Splitting: dividing into smaller subarrays',
      });
    }

    if (n.left) walkSplit(n.left);
    if (n.right) walkSplit(n.right);
  };

  walkSplit(root);

  for (const { node: leaf, parent } of deferredLeaves) {
    steps.push({
      id: `leaf:${leaf.id}`,
      kind: 'leaf',
      focusNodeId: `${leaf.id}:s`,
      nodesToShow: [`${leaf.id}:s`],
      edgesToShow: [edgeKey(`${parent.id}:s`, `${leaf.id}:s`)],
      message: 'Leaf: single element (already sorted)',
    });
  }

  const walkMerge = (n: TreeNode) => {
    if (!isInternal(n)) return;
    if (n.left) walkMerge(n.left);
    if (n.right) walkMerge(n.right);
    if (n === root) return; // keep root for the final "sorted" step

    const leftFrom = isInternal(n.left!) ? `${n.left!.id}:m` : `${n.left!.id}:s`;
    const rightFrom = isInternal(n.right!) ? `${n.right!.id}:m` : `${n.right!.id}:s`;
    const to = `${n.id}:m`;

    steps.push({
      id: `merge:${n.id}`,
      kind: 'merge',
      focusNodeId: to,
      nodesToShow: [to],
      edgesToShow: [edgeKey(leftFrom, to), edgeKey(rightFrom, to)],
      message: 'Merging: combining two sorted halves',
    });
  };
  walkMerge(root);

  if (isInternal(root)) {
    const leftFrom = isInternal(root.left!) ? `${root.left!.id}:m` : `${root.left!.id}:s`;
    const rightFrom = isInternal(root.right!) ? `${root.right!.id}:m` : `${root.right!.id}:s`;
    const to = `${root.id}:m`;
    steps.push({
      id: `sorted:${root.id}`,
      kind: 'sorted',
      focusNodeId: to,
      nodesToShow: [to],
      edgesToShow: [edgeKey(leftFrom, to), edgeKey(rightFrom, to)],
      message: 'Sorted: final array ready',
    });
  }

  return steps;
}

function buildMergeTimeline(root: TreeNode): AnimStep[] {
  const steps: AnimStep[] = [];

  const isLeaf = (n: TreeNode) => !n.left && !n.right;
  const isInternal = (n: TreeNode) => !!n.left && !!n.right;

  // 1) Split phase: DFS top-down visiting nodes with >1 values
  const walkSplit = (n: TreeNode) => {
    const vals = n.values ?? [];
    if (vals.length > 1) {
      steps.push({
        id: `split:${n.id}`,
        kind: 'split',
        nodeId: `${n.id}:s`,
        message: n === root ? 'Splitting: dividing the original array into halves' : 'Splitting: dividing into smaller subarrays',
      });
    }
    if (n.left) walkSplit(n.left);
    if (n.right) walkSplit(n.right);
  };
  walkSplit(root);

  // 2) Leaf phase: all leaf nodes
  const leaves: TreeNode[] = [];
  const collectLeaves = (n: TreeNode) => {
    if (isLeaf(n)) {
      leaves.push(n);
      return;
    }
    if (n.left) collectLeaves(n.left);
    if (n.right) collectLeaves(n.right);
  };
  collectLeaves(root);
  for (const l of leaves) {
    steps.push({
      id: `leaf:${l.id}`,
      kind: 'leaf',
      nodeId: `${l.id}:s`,
      message: 'Leaf: single element (already sorted)',
    });
  }

  // 3) Merge phase: post-order bottom-up internal nodes
  const walkMerge = (n: TreeNode) => {
    if (n.left) walkMerge(n.left);
    if (n.right) walkMerge(n.right);
    if (isInternal(n)) {
      steps.push({
        id: `merge:${n.id}`,
        kind: 'merge',
        nodeId: `${n.id}:m`,
        message: 'Merging: combining two sorted halves',
      });
    }
  };
  walkMerge(root);

  // 4) Final: root sorted
  steps.push({
    id: `sorted:${root.id}`,
    kind: 'sorted',
    nodeId: `${root.id}:m`,
    message: 'Sorted: final array ready',
  });

  return steps;
}

type NodeSpan = {
  node: TreeNode;
  depth: number;
  leafStart: number;
  leafEnd: number;
};

type PlacedNode = {
  id: string;
  kind: 'split' | 'merge';
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  values: number[];
  label: string;
};

type Edge = {
  fromId: string;
  toId: string;
  kind: 'split' | 'merge';
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

type InlineTransform = {
  scale: number;
  ox: number;
  oy: number;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

export const MergeSortTreeDiagram: React.FC<Props> = ({ root }) => {
  const isMobile = useIsMobile();
  const [isFull, setIsFull] = useState(false);
  const [hoverActiveNodeId, setHoverActiveNodeId] = useState<string | null>(null);

  const fullApiRef = useRef<FullscreenTreeViewerApi | null>(null);

  const [mode, setMode] = useState<'static' | 'animated'>('static');
  const timeline = useMemo(() => buildMergeTimeline(root), [root]);
  const revealTimeline = useMemo(() => buildRevealTimeline(root), [root]);
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoplay, setAutoplay] = useState(false);
  const [speedMs, setSpeedMs] = useState(700);

  const [isRecording, setIsRecording] = useState(false);
  const [recordSpeed, setRecordSpeed] = useState<0.5 | 1 | 1.5 | 2>(1);
  const [includeNarrationOverlay, setIncludeNarrationOverlay] = useState(true);
  const recordAbortRef = useRef(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunksRef = useRef<BlobPart[]>([]);

  const rootSplitId = `${root.id}:s`;
  const [revealCursor, setRevealCursor] = useState(0); // 0..revealTimeline.length
  const [visibleNodes, setVisibleNodes] = useState<Set<string>>(() => new Set([rootSplitId]));
  const [visibleEdges, setVisibleEdges] = useState<Set<string>>(() => new Set());
  const [enteringNodes, setEnteringNodes] = useState<Record<string, true>>({});
  const [enteringEdges, setEnteringEdges] = useState<Record<string, true>>({});
  const [leavingNodes, setLeavingNodes] = useState<Record<string, true>>({});
  const [leavingEdges, setLeavingEdges] = useState<Record<string, true>>({});
  const revealTimersRef = useRef<number[]>([]);

  const inlineViewportRef = useRef<HTMLDivElement | null>(null);
  const [inlineViewportSize, setInlineViewportSize] = useState({ w: 0, h: 0 });
  const inlinePanRef = useRef<{
    isPanning: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    dragged: boolean;
  }>({
    isPanning: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    dragged: false,
  });

  // Inline starts auto-fit and stays crisp; allow some zoom range.
  const INLINE_MIN_SCALE = 0.3;
  const INLINE_MAX_SCALE = 1.8;
  const INLINE_SOFT_MARGIN = 18;

  const layout = useMemo(() => {
    const cellW = isMobile ? 26 : 34;
    const cellH = isMobile ? 24 : 30;
    const cellGap = isMobile ? 8 : 10;
    const nodePadX = isMobile ? 8 : 10;
    const nodePadY = isMobile ? 6 : 8;
    // Premium spacing: more breathing room between levels and sibling subtrees.
    const nodeGapY = isMobile ? 22 : 28;
    const leafSpacing = isMobile ? 100 : 185;

    let leafCounter = 0;
    let maxDepth = 0;

    const spans: NodeSpan[] = [];

    const walk = (node: TreeNode, depth: number): NodeSpan => {
      maxDepth = Math.max(maxDepth, depth);

      if (!node.left && !node.right) {
        const idx = leafCounter;
        leafCounter++;
        const span: NodeSpan = { node, depth, leafStart: idx, leafEnd: idx };
        spans.push(span);
        return span;
      }

      const left = node.left ? walk(node.left, depth + 1) : null;
      const right = node.right ? walk(node.right, depth + 1) : null;

      const leafStart = left ? left.leafStart : right ? right.leafStart : leafCounter;
      const leafEnd = right ? right.leafEnd : left ? left.leafEnd : leafCounter;

      const span: NodeSpan = { node, depth, leafStart, leafEnd };
      spans.push(span);
      return span;
    };

    walk(root, 0);

    const leafCount = Math.max(1, leafCounter);
    const sidePad = isMobile ? 14 : 24;

    // Dedicated header row for the label pill so it never overlaps values.
    const badgeH = isMobile ? 16 : 18;
    const badgeY = 8;
    const headerGap = isMobile ? 10 : 12;
    const nodeHeight = Math.max(
      cellH + nodePadY * 2,
      badgeY + badgeH + headerGap + cellH + nodePadY,
    );
    const levelHeight = nodeHeight + nodeGapY;

    const splitLevelForDepth = (d: number) => d;
    const mergeLevelForDepth = (d: number) => 2 * maxDepth - d;

    const placed: PlacedNode[] = [];
    const edges: Edge[] = [];

    const splitPosById = new Map<string, PlacedNode>();
    const mergePosById = new Map<string, PlacedNode>();

    const widthForLen = (len: number) => {
      const contentW = len * cellW + Math.max(0, len - 1) * cellGap;
      return contentW + nodePadX * 2;
    };

    const mid = (leafCount - 1) / 2;

    for (const span of spans) {
      const { node, depth, leafStart, leafEnd } = span;
      const center = (leafStart + leafEnd) / 2;
      const spread = 1 + depth * (isMobile ? 0.028 : 0.045);
      const scaledCenter = mid + (center - mid) * spread;
      const baseX = sidePad + scaledCenter * leafSpacing;

      // Split node
      const splitValues = node.values ?? [];
      const splitWidth = widthForLen(splitValues.length);
      const splitLevel = splitLevelForDepth(depth);
      const splitY = splitLevel * levelHeight;
      const splitNode: PlacedNode = {
        id: `${node.id}:s`,
        kind: 'split',
        level: splitLevel,
        x: baseX,
        y: splitY,
        width: splitWidth,
        height: nodeHeight,
        values: splitValues,
        label: depth === 0 ? 'Original' : splitValues.length === 1 ? 'Leaf' : 'Split',
      };

      placed.push(splitNode);
      splitPosById.set(node.id, splitNode);

      // Merge node (only if internal)
      if (node.left && node.right) {
        const mergedValues = node.merged ?? [];
        const mergeWidth = widthForLen(mergedValues.length);
        const mergeLevel = mergeLevelForDepth(depth);
        const mergeY = mergeLevel * levelHeight;
        const mergeNode: PlacedNode = {
          id: `${node.id}:m`,
          kind: 'merge',
          level: mergeLevel,
          x: baseX,
          y: mergeY,
          width: mergeWidth,
          height: nodeHeight,
          values: mergedValues,
          label: depth === 0 ? 'Sorted' : 'Merge',
        };
        placed.push(mergeNode);
        mergePosById.set(node.id, mergeNode);
      }

      // Split edges
      if (node.left) edges.push({ fromId: `${node.id}:s`, toId: `${node.left.id}:s`, kind: 'split' });
      if (node.right) edges.push({ fromId: `${node.id}:s`, toId: `${node.right.id}:s`, kind: 'split' });

      // Merge edges (only for internal nodes)
      if (node.left && node.right) {
        const leftFrom = node.left.left || node.left.right ? `${node.left.id}:m` : `${node.left.id}:s`;
        const rightFrom = node.right.left || node.right.right ? `${node.right.id}:m` : `${node.right.id}:s`;
        edges.push({ fromId: leftFrom, toId: `${node.id}:m`, kind: 'merge' });
        edges.push({ fromId: rightFrom, toId: `${node.id}:m`, kind: 'merge' });
      }
    }

    // Compute content bounds.
    const maxNodeWidth = placed.reduce((acc, n) => Math.max(acc, n.width), 0);
    const contentWidth = Math.max(
      sidePad * 2 + (leafCount - 1) * leafSpacing + maxNodeWidth,
      sidePad * 2 + maxNodeWidth,
    );

    const maxLevel = placed.reduce((acc, n) => Math.max(acc, n.level), 0);
    const contentHeight = (maxLevel + 1) * levelHeight + (isMobile ? 18 : 24);

    // Normalize X so nothing gets clipped.
    const minLeft = placed.reduce((acc, n) => Math.min(acc, n.x - n.width / 2), Infinity);
    const shiftX = minLeft < 0 ? -minLeft + sidePad : 0;

    const placedShifted = placed.map((n) => ({ ...n, x: n.x + shiftX }));
    const placedById = new Map<string, PlacedNode>(placedShifted.map((n) => [n.id, n]));

    const bounds: Bounds = placedShifted.reduce<Bounds>(
      (acc, n) => {
        const left = n.x - n.width / 2;
        const right = n.x + n.width / 2;
        const top = n.y;
        const bottom = n.y + n.height;
        return {
          minX: Math.min(acc.minX, left),
          minY: Math.min(acc.minY, top),
          maxX: Math.max(acc.maxX, right),
          maxY: Math.max(acc.maxY, bottom),
        };
      },
      { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
    );

    const edgesWithCoords = edges
      .map((e) => {
        const from = placedById.get(e.fromId);
        const to = placedById.get(e.toId);
        if (!from || !to) return null;

        const x1 = from.x;
        const y1 = from.y + from.height;
        const x2 = to.x;
        const y2 = to.y;

        // Nudge the starting point a bit to reduce overlap for thick arrays.
        const dx = x2 - x1;
        const bend = clamp(Math.abs(dx) * 0.18, 10, 48);

        return {
          ...e,
          x1,
          y1,
          x2,
          y2,
          cx1: x1,
          cy1: y1 + bend,
          cx2: x2,
          cy2: y2 - bend,
        };
      })
      .filter(Boolean) as Array<
      Edge & { x1: number; y1: number; x2: number; y2: number; cx1: number; cy1: number; cx2: number; cy2: number }
    >;

    return {
      cellW,
      cellH,
      cellGap,
      nodePadX,
      nodePadY,
      badgeH,
      badgeY,
      headerGap,
      contentWidth: contentWidth + shiftX,
      contentHeight,
      nodes: placedShifted,
      edges: edgesWithCoords,
      bounds,
    };
  }, [isMobile, root]);

  const activeNodeId = useMemo(() => {
    if (mode === 'animated' && isFull) {
      if (revealCursor <= 0) return rootSplitId;
      return revealTimeline[Math.min(revealCursor - 1, Math.max(0, revealTimeline.length - 1))]?.focusNodeId ?? rootSplitId;
    }
    return hoverActiveNodeId;
  }, [hoverActiveNodeId, isFull, mode, revealCursor, revealTimeline, rootSplitId]);

  // Keep everything readable: no global opacity dimming (chips/text stay crisp).
  const dimOthers = useMemo(() => false, []);

  const allNodeIds = useMemo(() => new Set(layout.nodes.map((n) => n.id)), [layout.nodes]);
  const allEdgeIds = useMemo(() => new Set(layout.edges.map((e) => edgeKey(e.fromId, e.toId))), [layout.edges]);

  const clearRevealTimers = () => {
    for (const id of revealTimersRef.current) window.clearTimeout(id);
    revealTimersRef.current = [];
  };

  const resetRevealState = () => {
    clearRevealTimers();
    setRevealCursor(0);
    setVisibleNodes(new Set([rootSplitId]));
    setVisibleEdges(new Set());
    setEnteringNodes({});
    setEnteringEdges({});
    setLeavingNodes({});
    setLeavingEdges({});
  };

  const applyRevealStep = (s: RevealStep) => {
    const addNodes = s.nodesToShow.filter((id) => allNodeIds.has(id) && !visibleNodes.has(id));
    const addEdges = s.edgesToShow.filter((id) => allEdgeIds.has(id) && !visibleEdges.has(id));

    if (addNodes.length) {
      setVisibleNodes((prev) => {
        const next = new Set(prev);
        for (const id of addNodes) next.add(id);
        return next;
      });
      setEnteringNodes((prev) => {
        const next = { ...prev };
        for (const id of addNodes) next[id] = true;
        return next;
      });
      const tid = window.setTimeout(() => {
        setEnteringNodes((prev) => {
          const next = { ...prev };
          for (const id of addNodes) delete next[id];
          return next;
        });
      }, 220);
      revealTimersRef.current.push(tid);
    }

    if (addEdges.length) {
      setVisibleEdges((prev) => {
        const next = new Set(prev);
        for (const id of addEdges) next.add(id);
        return next;
      });
      setEnteringEdges((prev) => {
        const next = { ...prev };
        for (const id of addEdges) next[id] = true;
        return next;
      });
      const tid = window.setTimeout(() => {
        setEnteringEdges((prev) => {
          const next = { ...prev };
          for (const id of addEdges) delete next[id];
          return next;
        });
      }, 220);
      revealTimersRef.current.push(tid);
    }
  };

  const unapplyRevealStep = (s: RevealStep) => {
    const removeNodes = s.nodesToShow.filter((id) => visibleNodes.has(id));
    const removeEdges = s.edgesToShow.filter((id) => visibleEdges.has(id));

    if (removeNodes.length) {
      setLeavingNodes((prev) => {
        const next = { ...prev };
        for (const id of removeNodes) next[id] = true;
        return next;
      });
      const tid = window.setTimeout(() => {
        setVisibleNodes((prev) => {
          const next = new Set(prev);
          for (const id of removeNodes) next.delete(id);
          return next;
        });
        setLeavingNodes((prev) => {
          const next = { ...prev };
          for (const id of removeNodes) delete next[id];
          return next;
        });
      }, 180);
      revealTimersRef.current.push(tid);
    }

    if (removeEdges.length) {
      setLeavingEdges((prev) => {
        const next = { ...prev };
        for (const id of removeEdges) next[id] = true;
        return next;
      });
      const tid = window.setTimeout(() => {
        setVisibleEdges((prev) => {
          const next = new Set(prev);
          for (const id of removeEdges) next.delete(id);
          return next;
        });
        setLeavingEdges((prev) => {
          const next = { ...prev };
          for (const id of removeEdges) delete next[id];
          return next;
        });
      }, 180);
      revealTimersRef.current.push(tid);
    }
  };

  const revealNext = () => {
    if (revealCursor >= revealTimeline.length) return;
    const step = revealTimeline[revealCursor];
    if (!step) return;
    applyRevealStep(step);
    setRevealCursor((v) => Math.min(revealTimeline.length, v + 1));
  };

  const revealPrev = () => {
    if (revealCursor <= 0) return;
    const step = revealTimeline[revealCursor - 1];
    if (!step) return;
    unapplyRevealStep(step);
    setRevealCursor((v) => Math.max(0, v - 1));
  };

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
        <linearGradient id="merge-bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#070B12" />
          <stop offset="100%" stopColor="#0B1220" />
        </linearGradient>

        <marker id="arrow-split" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={PALETTE.edgeBlue} vectorEffect="non-scaling-stroke" />
        </marker>
        <marker id="arrow-merge" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={PALETTE.edgeAmber} vectorEffect="non-scaling-stroke" />
        </marker>
        <marker id="arrow-sorted" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
          <path d="M0,0 L8,4 L0,8 z" fill={PALETTE.edgeGreen} vectorEffect="non-scaling-stroke" />
        </marker>
      </defs>

      <rect x={0} y={0} width={layout.contentWidth} height={layout.contentHeight} fill="url(#merge-bg)" />

      {layout.edges.map((e, idx) => {
        const k = edgeKey(e.fromId, e.toId);
        const isVisible = showAll || visibleEdges.has(k) || !!leavingEdges[k];
        if (!isVisible) return null;

        const isActive = active.edges.has(k);
        const isEntering = !!enteringEdges[k];
        const isLeaving = !!leavingEdges[k];

        const isSortedEdge = e.toId === `${root.id}:m`;
        const stroke = isSortedEdge ? PALETTE.edgeGreen : e.kind === 'split' ? PALETTE.edgeBlue : PALETTE.edgeAmber;

        const marker = isSortedEdge ? 'url(#arrow-sorted)' : e.kind === 'split' ? 'url(#arrow-split)' : 'url(#arrow-merge)';
        const baseW = 2.75;

        return (
          <path
            key={`${e.fromId}-${e.toId}-${idx}`}
            d={`M ${e.x1} ${e.y1} C ${e.cx1} ${e.cy1}, ${e.cx2} ${e.cy2}, ${e.x2} ${e.y2}`}
            fill="none"
            stroke={stroke}
            strokeWidth={isActive ? baseW + 0.3 : baseW}
            strokeLinecap="round"
            strokeLinejoin="round"
            markerEnd={marker}
            vectorEffect="non-scaling-stroke"
            opacity={isLeaving ? 0 : isEntering ? 0 : 1}
            style={{ transition: 'opacity 180ms ease' }}
          />
        );
      })}

      {layout.nodes.map((n) => {
        const isVisible = showAll || visibleNodes.has(n.id) || !!leavingNodes[n.id];
        if (!isVisible) return null;

        const isSplit = n.kind === 'split';
        const isActive = active.nodes.has(n.id);
        const isEntering = !!enteringNodes[n.id];
        const isLeaving = !!leavingNodes[n.id];
        const isHovered = hoverActiveNodeId === n.id;

        const isSorted = n.label === 'Sorted';
        const phase: 'split' | 'merge' | 'sorted' = isSorted ? 'sorted' : isSplit ? 'split' : 'merge';

        // Image-2 style: dark container + crisp accent + white chips (no blur).
        const colors =
          phase === 'sorted'
            ? { border: PALETTE.green, fill: PALETTE.nodeFill, badgeDot: PALETTE.green }
            : phase === 'merge'
              ? { border: PALETTE.amber, fill: PALETTE.nodeFill, badgeDot: PALETTE.amber }
              : { border: PALETTE.blue, fill: PALETTE.nodeFill, badgeDot: PALETTE.blue };

        const valueFont = isMobile ? 15 : 17;

        const left = Math.round(n.x - n.width / 2);
        const top = Math.round(n.y);

        const contentW = n.values.length * layout.cellW + Math.max(0, n.values.length - 1) * layout.cellGap;
        const cellsStartX = Math.round((n.width - contentW) / 2);

        const badgeH = layout.badgeH;
        const badgeFont = isMobile ? 10 : 11;
        const badgeX = 10;
        const badgeY = layout.badgeY;
        const badgePadX = 10;
        const badgeText = n.label;
        const badgeW = Math.max(64, badgeText.length * (badgeFont - 1) + badgePadX * 2);

        const headerGap = layout.headerGap;
        const cellY = Math.round(badgeY + badgeH + headerGap);

        const isRootOriginal = n.id === rootSplitId;
        const isFinalSorted = n.id === `${root.id}:m`;

        const baseScale = isFinalSorted ? 1.08 : isRootOriginal ? 1.06 : 1;
        const extraY = isEntering || isLeaving ? -6 : 0;
        const extraScale = (isEntering || isLeaving ? 0.96 : 1) * baseScale;
        const opacity = isLeaving ? 0 : isEntering ? 0 : 1;

        return (
          <g
            key={n.id}
            transform={`translate(${left}, ${top})`}
            onMouseEnter={() => setHoverActiveNodeId(n.id)}
            onMouseLeave={() => setHoverActiveNodeId((prev) => (prev === n.id ? null : prev))}
            onFocus={() => setHoverActiveNodeId(n.id)}
            onBlur={() => setHoverActiveNodeId((prev) => (prev === n.id ? null : prev))}
            tabIndex={0}
            role="button"
            aria-label={`${n.kind} node ${n.label}`}
            style={{ cursor: 'default', outline: 'none' }}
          >
            <g
              style={{
                opacity: (dimOthers && !isActive ? 0.72 : 1) * opacity,
                transform: `translateY(${extraY}px) scale(${extraScale})`,
                transformOrigin: 'center',
                transformBox: 'fill-box',
                transition: 'opacity 180ms ease-out, transform 180ms ease-out',
              }}
            >
            {/* Soft depth (no glow): offset shadow plates */}
            <rect
              x={2}
              y={3}
              width={n.width}
              height={n.height}
              rx={12}
              fill={'rgba(0,0,0,0.22)'}
            />
            <rect
              x={1}
              y={2}
              width={n.width}
              height={n.height}
              rx={12}
              fill={'rgba(0,0,0,0.14)'}
            />

            <rect
              x={0}
              y={0}
              width={n.width}
              height={n.height}
              rx={12}
              fill={colors.fill}
              stroke={isActive || isHovered ? colors.border : PALETTE.chrome}
              strokeWidth={isFinalSorted ? 2.2 : isActive ? 1.9 : isHovered ? 1.7 : 1.25}
              vectorEffect="non-scaling-stroke"
            />

            <rect x={0} y={0} width={n.width} height={4} rx={12} fill={colors.border} opacity={0.95} />

            {/* Phase badge/pill (visually obvious) */}
            <g transform={`translate(${badgeX}, ${badgeY})`}>
              <rect
                x={0}
                y={0}
                width={badgeW}
                height={badgeH}
                rx={999}
                fill={PALETTE.chipBg}
                stroke={'rgba(15,23,42,0.22)'}
                strokeWidth={1}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={Math.round(badgeH / 2)}
                cy={Math.round(badgeH / 2)}
                r={Math.max(3, Math.round(badgeH / 2) - 4)}
                fill={colors.badgeDot}
              />
              <text
                x={Math.round(badgeH / 2 + 8)}
                y={Math.round(badgeH / 2)}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={badgeFont}
                fontWeight={800}
                fill={PALETTE.chipText}
                style={{ fontFamily: 'Inter, ui-sans-serif, system-ui' }}
              >
                {badgeText}
              </text>
            </g>

            {n.values.map((v, i) => {
              const x = cellsStartX + i * (layout.cellW + layout.cellGap);
              return (
                <g key={`${n.id}-v-${i}`} transform={`translate(${x}, ${cellY})`}>
                  <rect
                    x={0}
                    y={0}
                    width={layout.cellW}
                    height={layout.cellH}
                    rx={6}
                    fill={PALETTE.chipBg}
                    stroke={'rgba(148,163,184,0.70)'}
                    strokeWidth={1}
                    vectorEffect="non-scaling-stroke"
                  />
                  <text
                    x={layout.cellW / 2}
                    y={layout.cellH / 2}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize={valueFont}
                    fontWeight={600}
                    fill={PALETTE.chipText}
                    style={{ fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' }}
                  >
                    {v}
                  </text>
                </g>
              );
            })}
            </g>
          </g>
        );
      })}
    </svg>
  );

  const getInlineViewportSize = () => {
    if (inlineViewportSize.w && inlineViewportSize.h) return inlineViewportSize;
    return { w: layout.contentWidth, h: layout.contentHeight };
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

    // Initialize once.
    const rect = el.getBoundingClientRect();
    setInlineViewportSize({ w: rect.width, h: rect.height });

    return () => ro.disconnect();
  }, []);

  const getCenteredTranslate = (scale: number) => {
    const { w, h } = getInlineViewportSize();
    const bw = Math.max(1, layout.bounds.maxX - layout.bounds.minX);
    const bh = Math.max(1, layout.bounds.maxY - layout.bounds.minY);
    const x = (w - bw * scale) / 2 - layout.bounds.minX * scale;
    const y = (h - bh * scale) / 2 - layout.bounds.minY * scale;
    return { x, y };
  };

  const clampInlineOffsets = (scale: number, ox: number, oy: number) => {
    const { w, h } = getInlineViewportSize();
    const base = getCenteredTranslate(scale);

    const minX = layout.bounds.minX * scale + base.x;
    const maxX = layout.bounds.maxX * scale + base.x;
    const minY = layout.bounds.minY * scale + base.y;
    const maxY = layout.bounds.maxY * scale + base.y;

    // Clamp so the scene can't be dragged completely off-screen.
    const xMin = (INLINE_SOFT_MARGIN - maxX) - 0;
    const xMax = (w - INLINE_SOFT_MARGIN - minX) - 0;
    const yMin = (INLINE_SOFT_MARGIN - maxY) - 0;
    const yMax = (h - INLINE_SOFT_MARGIN - minY) - 0;

    const clampOrZero = (val: number, a: number, b: number) => {
      if (!Number.isFinite(a) || !Number.isFinite(b) || a > b) return 0;
      return clamp(val, a, b);
    };

    return {
      ox: clampOrZero(ox, xMin, xMax),
      oy: clampOrZero(oy, yMin, yMax),
    };
  };

  const [inlineT, setInlineT] = useState<InlineTransform>({ scale: 1, ox: 0, oy: 0 });
  const didAutoFitRef = useRef(false);

  const inlineBase = getCenteredTranslate(inlineT.scale);

  // Render zoom via SVG viewBox (camera) to avoid CSS-scale blur.
  const inlineViewBox = useMemo(() => {
    const vw = Math.max(1, inlineViewportSize.w || layout.contentWidth);
    const vh = Math.max(1, inlineViewportSize.h || layout.contentHeight);
    const s = Math.max(0.0001, inlineT.scale);

    const vbW = vw / s;
    const vbH = vh / s;

    // Convert the previous CSS transform (translate + scale) into camera viewBox coordinates.
    let x = -(inlineBase.x + inlineT.ox) / s;
    let y = -(inlineBase.y + inlineT.oy) / s;

    // Clamp to keep content reachable and avoid blank view on resize.
    const pad = 24;
    const minX = layout.bounds.minX - pad;
    const maxX = layout.bounds.maxX + pad - vbW;
    const minY = layout.bounds.minY - pad;
    const maxY = layout.bounds.maxY + pad - vbH;
    if (Number.isFinite(minX) && Number.isFinite(maxX) && maxX >= minX) x = clamp(x, minX, maxX);
    if (Number.isFinite(minY) && Number.isFinite(maxY) && maxY >= minY) y = clamp(y, minY, maxY);

    // Snap camera to whole units for maximum crispness.
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

  const getInlineFitScale = (padding: number) => {
    const { w, h } = getInlineViewportSize();
    const bw = Math.max(1, layout.bounds.maxX - layout.bounds.minX);
    const bh = Math.max(1, layout.bounds.maxY - layout.bounds.minY);
    const targetW = Math.max(1, w - padding * 2);
    const targetH = Math.max(1, h - padding * 2);
    return clamp(Math.min(targetW / bw, targetH / bh), INLINE_MIN_SCALE, INLINE_MAX_SCALE);
  };

  const applyInlineFit = () => {
    const s = getInlineFitScale(isMobile ? 18 : 28);
    setInlineT({ scale: s, ox: 0, oy: 0 });
  };

  const resetInline = () => {
    applyInlineFit();
  };

  // Auto-fit once when the inline viewport is measured and whenever root changes.
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

  // Animated-mode player loop (fullscreen only).
  // Stable scheduling: self-rescheduling setTimeout with cleanup.
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

  // Reset player state when closing fullscreen.
  useLayoutEffect(() => {
    if (isFull) return;
    setIsPlaying(false);
    setMode('static');
    setStepIndex(0);
    resetRevealState();
  }, [isFull]);

  // Reset reveal state on root change.
  useEffect(() => {
    resetRevealState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [root]);

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

      // World point under cursor before zoom.
      const worldX = (px - (basePrev.x + prev.ox)) / prev.scale;
      const worldY = (py - (basePrev.y + prev.oy)) / prev.scale;

      // Offsets required to keep that world point under cursor after zoom.
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
            <div className="text-sm font-semibold text-foreground truncate">Merge Sort Tree</div>
            <div className="text-[11px] text-muted-foreground">Split (blue) then merge (yellow)</div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1 rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-blue-500/70" /> Split
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-yellow-500/70" /> Merge
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-green-500/30 bg-green-500/10 px-2 py-0.5">
              <span className="h-2 w-2 rounded-full bg-green-500/70" /> Sorted
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
              className="relative w-full max-w-[1200px] rounded-xl ring-1 ring-white/10 bg-gradient-to-b from-[#070B12] to-[#0B1220] transition-shadow hover:shadow-md cursor-zoom-in overflow-hidden"
              onClick={(e) => {
                // Avoid opening fullscreen when user is panning.
                if (e.detail > 1) return;
                if (inlinePanRef.current.dragged) return;
                setIsFull(true);
              }}
              onDoubleClick={(e) => {
                e.stopPropagation();
                resetInline();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') setIsFull(true);
              }}
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
                  // Ctrl/⌘ + wheel zooms (only when hovering the diagram).
                  if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    const direction = e.deltaY > 0 ? -1 : 1;
                    const factor = direction > 0 ? 1.06 : 0.94;
                    zoomInlineAtPoint(e.clientX, e.clientY, inlineT.scale * factor);
                    return;
                  }

                  // Wheel alone: allow normal page scrolling by default.
                  // If the user has already panned/zoomed, treat wheel as a subtle pan.
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

      <FullscreenTreeViewer
        open={isFull}
        onOpenChange={setIsFull}
        title="Merge Sort Tree"
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
                a.download = 'merge-sort-tree.svg';
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
                a.download = 'merge-sort-tree.png';
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
              <div className="pointer-events-auto absolute left-4 top-4 max-w-[520px] rounded-2xl border border-white/10 bg-[#0B1220] px-4 py-3 shadow-xl">
                <div className="text-xs font-semibold tracking-wide text-slate-200">
                  {(revealCursor <= 0 ? 'START' : revealTimeline[revealCursor - 1]?.kind?.toUpperCase()) ?? 'ANIMATION'}
                </div>
                <div className="mt-1 text-[12px] text-slate-300">
                  {(revealCursor <= 0
                    ? 'Starting Merge Sort: original array'
                    : revealTimeline[revealCursor - 1]?.message) ?? ''}
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

                            // Snapshot current state so we can restore after recording.
                            const snapMode = mode;
                            const snapCursor = revealCursor;
                            const snapNodes = new Set(visibleNodes);
                            const snapEdges = new Set(visibleEdges);

                            setIsPlaying(false);
                            if (snapMode !== 'animated') setMode('animated');

                            // Deterministic recording: start from step 0 with no transition flags.
                            clearRevealTimers();
                            setEnteringNodes({});
                            setEnteringEdges({});
                            setLeavingNodes({});
                            setLeavingEdges({});
                            setVisibleNodes(new Set([rootSplitId]));
                            setVisibleEdges(new Set());
                            setRevealCursor(0);

                            recordAbortRef.current = false;
                            recordChunksRef.current = [];
                            setIsRecording(true);

                            const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
                            const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(() => r(), ms));

                            // Build cumulative states (no removals) from the existing reveal timeline.
                            const states: Array<{ cursor: number; nodes: Set<string>; edges: Set<string>; message: string }> = [];
                            let nodes = new Set<string>([rootSplitId]);
                            let edges = new Set<string>();
                            states.push({ cursor: 0, nodes: new Set(nodes), edges: new Set(edges), message: 'Starting Merge Sort: original array' });
                            for (let i = 0; i < revealTimeline.length; i++) {
                              const step = revealTimeline[i];
                              if (!step) continue;
                              for (const id of step.nodesToShow) nodes.add(id);
                              for (const id of step.edgesToShow) edges.add(id);
                              states.push({
                                cursor: i + 1,
                                nodes: new Set(nodes),
                                edges: new Set(edges),
                                message: step.message,
                              });
                            }

                            const fitViewBox = api.getFitViewBox(56);
                            const parts = fitViewBox.split(/\s+/).map((v) => Number(v));
                            const vbW = Number.isFinite(parts[2]) ? parts[2] : 0;
                            const vbH = Number.isFinite(parts[3]) ? parts[3] : 0;
                            if (!vbW || !vbH) {
                              setIsRecording(false);
                              return;
                            }

                            // Recording surface.
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
                              a.download = 'merge-sort-tree.webm';
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
                              clearRevealTimers();
                              setEnteringNodes({});
                              setEnteringEdges({});
                              setLeavingNodes({});
                              setLeavingEdges({});
                              setVisibleNodes(new Set(snapNodes));
                              setVisibleEdges(new Set(snapEdges));
                              setRevealCursor(snapCursor);
                            };
                            rec.start();

                            // Render each step as an SVG frame into the canvas.
                            for (let i = 0; i < states.length; i++) {
                              if (recordAbortRef.current) break;

                              const st = states[i];
                              setEnteringNodes({});
                              setEnteringEdges({});
                              setLeavingNodes({});
                              setLeavingEdges({});
                              setVisibleNodes(new Set(st.nodes));
                              setVisibleEdges(new Set(st.edges));
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
                                const text = st.message;
                                ctx.fillText(text, pad + 14, vbH - h / 2 - pad, vbW - pad * 2 - 28);
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
                        <Switch checked={autoplay} onCheckedChange={(v) => setAutoplay(!!v)} />
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
                        Step {Math.min(revealCursor, Math.max(1, revealTimeline.length))} / {Math.max(1, revealTimeline.length)}
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
      </FullscreenTreeViewer>
    </div>
  );
};
