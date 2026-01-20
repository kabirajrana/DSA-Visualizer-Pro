import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { AlgorithmType, Highlights, Step } from '@/lib/stepTypes';
import { ArrayCell } from './ArrayCell';
import { MoveArrow } from './MoveArrow';

interface StepRowProps {
  step: Step;
  prevStep?: Step;
  stepNumber: number;
  isActive: boolean;
  isPast?: boolean;
  showArrows?: boolean;
  stableLayout?: boolean;
  indicatorMode?: 'pictorial' | 'focus';
  algorithm?: AlgorithmType;
}

const FALLBACK_CELL_WIDTH = 40;
const FALLBACK_CELL_GAP = 4;
const BASE_ACTIVE_ANIMATION_MS = 520;
const SWAP_ANIMATION_MS = 900;

// Visual-only timing (pictorial mode). Kept out of step generation/engine.
const PICTORIAL_INDICATOR_LEAD_MS = 90;
const PICTORIAL_MERGE_SLOWDOWN_MS = 650;
const PICTORIAL_HEAP_SLOWDOWN_MS = 350;

export const StepRow: React.FC<StepRowProps> = ({
  step,
  prevStep,
  stepNumber,
  isActive,
  isPast = false,
  showArrows = true,
  stableLayout = false,
  indicatorMode = 'focus',
  algorithm,
}) => {
  const [phase, setPhase] = useState<'before' | 'after'>('before');
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const rowRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLDivElement>(null);
  const cellRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const expectedGeometryKeyRef = useRef<string>('');
  const [cellWidth, setCellWidth] = useState(FALLBACK_CELL_WIDTH);
  const [cellGap, setCellGap] = useState(FALLBACK_CELL_GAP);
  const [measuredGeometry, setMeasuredGeometry] = useState<{
    key: string;
    rects: Record<number, { left: number; top: number; width: number; height: number }>;
  }>({ key: '', rects: {} });
  const [validatedGeometry, setValidatedGeometry] = useState<{
    key: string;
    rects: Record<number, { left: number; top: number; width: number; height: number }>;
  }>({ key: '', rects: {} });

  const swapArrow = useMemo(() => step.moveArrows.find((a) => a.type === 'swap') ?? null, [step.moveArrows]);
  const compareArrow = useMemo(() => step.moveArrows.find((a) => a.type === 'compare') ?? null, [step.moveArrows]);
  const hasSwap = Boolean(swapArrow) || step.highlights.before.swap.length > 0 || step.highlights.after.swap.length > 0;
  const hasCompare = Boolean(compareArrow) || step.highlights.before.compare.length > 0 || step.highlights.after.compare.length > 0;

  // Swap steps need more time so users can clearly observe the movement.
  const activeAnimationMs = useMemo(
    () => (swapArrow ? SWAP_ANIMATION_MS : BASE_ACTIVE_ANIMATION_MS),
    [swapArrow],
  );

  const { indicatorLeadMs, pictorialAnimationMs } = useMemo(() => {
    if (indicatorMode !== 'pictorial') {
      return { indicatorLeadMs: 0, pictorialAnimationMs: activeAnimationMs };
    }

    let leadMs = PICTORIAL_INDICATOR_LEAD_MS;
    let animMs = activeAnimationMs;

    if (algorithm === 'merge-sort') {
      const looksLikeMergeStep =
        step.label.startsWith('Merge') ||
        step.label.startsWith('Merged') ||
        step.highlights.before.compare.length > 0 ||
        step.highlights.after.compare.length > 0;

      if (looksLikeMergeStep) {
        leadMs = Math.max(leadMs, 120);
        animMs = Math.max(animMs, activeAnimationMs + PICTORIAL_MERGE_SLOWDOWN_MS);
      }
    }

    if (algorithm === 'heap-sort') {
      const label = step.label.toLowerCase();
      const looksLikeHeapMotion = Boolean(swapArrow) || label.includes('heapify') || label.includes('extract');
      if (looksLikeHeapMotion) {
        animMs = Math.max(animMs, activeAnimationMs + PICTORIAL_HEAP_SLOWDOWN_MS);
      }
    }

    return { indicatorLeadMs: leadMs, pictorialAnimationMs: animMs };
  }, [activeAnimationMs, algorithm, indicatorMode, step.highlights.after.compare.length, step.highlights.before.compare.length, step.label, swapArrow]);

  const currentArray = useMemo(() => {
    if (isActive) return phase === 'after' ? step.after : step.before;
    return isPast ? step.after : step.before;
  }, [isActive, isPast, phase, step.after, step.before]);

  const currentHighlights = useMemo(() => {
    const base: Highlights = isActive
      ? (phase === 'after' ? step.highlights.after : step.highlights.before)
      : (isPast ? step.highlights.after : step.highlights.before);

    // Pictorial mode shows a timeline; to prevent the eye from catching stale/previous compare
    // highlights (which reads like the indicator “touched” a wrong index), we only render
    // transient indicators on the *active* row.
    if (indicatorMode === 'pictorial' && !isActive) {
      return { ...base, compare: [], swap: [], key: [], shift: [] };
    }

    return base;
  }, [indicatorMode, isActive, isPast, phase, step.highlights.after, step.highlights.before]);

  const pointersForRow = useMemo(() => (isActive ? step.pointers : {}), [isActive, step.pointers]);

  const isFullySorted = useMemo(() => {
    const len = Math.max(step.after.length, step.before.length);
    if (len <= 0) return false;
    const sorted = new Set<number>([
      ...(step.highlights.before.sorted ?? []),
      ...(step.highlights.after.sorted ?? []),
    ]);
    return sorted.size >= len;
  }, [step.after.length, step.before.length, step.highlights.after.sorted, step.highlights.before.sorted]);

  const useQuickSortLayout = useMemo(() => {
    if (algorithm !== 'quick-sort') return false;
    // Quick Sort always provides low/high; pivot is present during partition steps.
    // Keep this renderer opt-in by algorithm so other visualizations stay unchanged.
    return true;
  }, [algorithm]);

  const useMergeSortLayout = useMemo(() => {
    // Render-only upgrade: detect Merge Sort steps via labels to avoid touching step logic.
    const label = step.label;
    if (label.startsWith('Divide') || label.startsWith('Merge') || label.startsWith('Merged')) return true;
    return algorithm === 'merge-sort' && (step.pointers.left != null || step.pointers.right != null || step.pointers.mid != null);
  }, [algorithm, step.label, step.pointers.left, step.pointers.mid, step.pointers.right]);

  const mergeMeta = useMemo(() => {
    if (!useMergeSortLayout) return null;

    const left = (step.pointers.left ?? prevStep?.pointers.left) ?? null;
    const right = (step.pointers.right ?? prevStep?.pointers.right) ?? null;
    let mid = (step.pointers.mid ?? prevStep?.pointers.mid) ?? null;
    if (mid == null && left != null && right != null) {
      mid = Math.floor((left + right) / 2);
    }

    const stage: 'divide' | 'merge' | 'merged' | 'other' = step.label.startsWith('Divide')
      ? 'divide'
      : step.label.startsWith('Merged')
        ? 'merged'
        : step.label.startsWith('Merge')
          ? 'merge'
          : 'other';

    return { left, mid, right, stage };
  }, [prevStep?.pointers.left, prevStep?.pointers.mid, prevStep?.pointers.right, step.label, step.pointers.left, step.pointers.mid, step.pointers.right, useMergeSortLayout]);

  const mergeSources = useMemo(() => {
    if (!mergeMeta || mergeMeta.stage !== 'merged') return null;
    const { left, right } = mergeMeta;
    if (left == null || right == null) return null;

    // Prefer the pre-merge snapshot from the prior step if available.
    const beforeBase = prevStep?.label.startsWith('Merge') ? prevStep.before : step.before;
    const mid = mergeMeta.mid;
    if (mid == null) return null;

    const leftArr = beforeBase.slice(left, mid + 1);
    const rightArr = beforeBase.slice(mid + 1, right + 1);

    // Simulate stable merge to label each output pick and its source position.
    const picks: Array<'L' | 'R'> = [];
    const sourceGlobalIndices: number[] = [];
    let i = 0;
    let j = 0;
    const total = right - left + 1;

    let exhausted: null | { side: 'L' | 'R'; atOutputIndex: number } = null;

    for (let t = 0; t < total; t++) {
      const leftVal = i < leftArr.length ? leftArr[i] : null;
      const rightVal = j < rightArr.length ? rightArr[j] : null;

      if (rightVal == null || (leftVal != null && leftVal <= rightVal)) {
        picks.push('L');
        sourceGlobalIndices.push(left + i);
        i++;
      } else {
        picks.push('R');
        sourceGlobalIndices.push(mid + 1 + j);
        j++;
      }

      if (!exhausted) {
        if (i >= leftArr.length && j < rightArr.length) exhausted = { side: 'L', atOutputIndex: t };
        if (j >= rightArr.length && i < leftArr.length) exhausted = { side: 'R', atOutputIndex: t };
      }
    }

    const highlightDelayMs = 120;
    const sourceToPickIndex: Record<number, number> = {};
    for (let t = 0; t < sourceGlobalIndices.length; t++) {
      sourceToPickIndex[sourceGlobalIndices[t]] = t;
    }

    return { picks, sourceGlobalIndices, sourceToPickIndex, exhausted, highlightDelayMs };
  }, [mergeMeta, prevStep?.before, prevStep?.label, step.before]);

  const quickMeta = useMemo(() => {
    if (!useQuickSortLayout) return null;

    const low = step.pointers.low ?? null;
    const high = step.pointers.high ?? null;
    // Pivot pointer is null for recursion markers; for partition steps it is an index.
    const pivotIndex = step.pointers.pivot ?? step.highlights.before.pivot?.[0] ?? step.highlights.after.pivot?.[0] ?? null;
    const i = step.pointers.i ?? null;
    const j = step.pointers.j ?? null;

    return { low, high, pivotIndex, i, j };
  }, [step.highlights.after.pivot, step.highlights.before.pivot, step.pointers.high, step.pointers.i, step.pointers.j, step.pointers.low, step.pointers.pivot, useQuickSortLayout]);

  const effectivePointersForRow = useMemo(() => {
    // Quick Sort UX: pointer badges must never cover numbers.
    // Render pointers as chips in the header instead.
    if (useQuickSortLayout) return {};
    return pointersForRow;
  }, [pointersForRow, useQuickSortLayout]);

  const dimIndices = useMemo(() => {
    if (!isActive || !showArrows || !hasSwap || phase !== 'before' || !swapArrow) return new Set<number>();
    if (indicatorMode === 'pictorial' && !animationsEnabled) return new Set<number>();
    return new Set([swapArrow.fromIndex, swapArrow.toIndex]);
  }, [animationsEnabled, hasSwap, indicatorMode, isActive, phase, showArrows, swapArrow]);

  const quickDimIndices = useMemo(() => {
    if (!useQuickSortLayout) return new Set<number>();

    // Step generator already marks eliminated indices; we reuse that for dimming.
    const base = currentHighlights.eliminated ?? [];
    return new Set(base);
  }, [currentHighlights.eliminated, useQuickSortLayout]);

  const mergedDimIndices = useMemo(() => {
    if (!useQuickSortLayout) return dimIndices;
    // Combine swap-dim with eliminated-dim (swap takes precedence visually but both are dim.
    const combined = new Set<number>(Array.from(dimIndices));
    for (const idx of quickDimIndices) combined.add(idx);
    return combined;
  }, [dimIndices, quickDimIndices, useQuickSortLayout]);

  const emptyHighlightsForView = useMemo<Highlights>(
    () => ({ compare: [], swap: [], key: [], sorted: [], found: [], shift: [], pivot: [], eliminated: [] }),
    [],
  );

  const effectiveHighlights = useMemo(() => {
    if (!useQuickSortLayout) return currentHighlights;
    // Beginner-first: on compare steps, highlight ONLY current element + pivot (plus dimming/sorted).
    if (step.label.startsWith('Compare with Pivot')) {
      return {
        ...emptyHighlightsForView,
        compare: currentHighlights.compare,
        pivot: currentHighlights.pivot,
        sorted: currentHighlights.sorted,
        eliminated: currentHighlights.eliminated,
      };
    }
    return currentHighlights;
  }, [currentHighlights, emptyHighlightsForView, step.label, useQuickSortLayout]);

  const quickCompareFocusDim = useMemo(() => {
    if (!useQuickSortLayout) return new Set<number>();
    if (!isActive) return new Set<number>();
    if (!step.label.startsWith('Compare with Pivot')) return new Set<number>();
    const low = quickMeta?.low;
    const high = quickMeta?.high;
    const j = quickMeta?.j;
    const pivotIndex = quickMeta?.pivotIndex;
    if (low == null || high == null || j == null || pivotIndex == null) return new Set<number>();

    const keep = new Set<number>([j, pivotIndex]);
    const dim = new Set<number>();
    for (let idx = low; idx <= high; idx++) {
      if (!keep.has(idx)) dim.add(idx);
    }
    return dim;
  }, [isActive, quickMeta?.high, quickMeta?.j, quickMeta?.low, quickMeta?.pivotIndex, step.label, useQuickSortLayout]);

  // Pictorial mode: avoid any first-paint phase flash (critical for Quick Sort correctness).
  useLayoutEffect(() => {
    if (indicatorMode !== 'pictorial') return;
    if (!isActive) {
      setPhase(isPast ? 'after' : 'before');
      setAnimationsEnabled(true);
      return;
    }
    setPhase('before');
    setAnimationsEnabled(false);
  }, [indicatorMode, isActive, isPast, stepNumber]);

  // Drive the “before → after” morph for the active step only.
  // Pictorial mode enforces strict visual order:
  // 1) show indicator at explicit step indices
  // 2) wait a small visual delay
  // 3) run compare/swap animation overlays
  // 4) switch array state to `after`
  useEffect(() => {
    if (!isActive) {
      if (indicatorMode !== 'pictorial') setPhase(isPast ? 'after' : 'before');
      return;
    }

    if (indicatorMode !== 'pictorial') {
      setPhase('before');
      const timer = window.setTimeout(() => {
        setPhase('after');
      }, activeAnimationMs);
      return () => window.clearTimeout(timer);
    }

    const leadTimer = window.setTimeout(() => {
      setAnimationsEnabled(true);
    }, indicatorLeadMs);

    const phaseTimer = window.setTimeout(() => {
      setPhase('after');
    }, indicatorLeadMs + pictorialAnimationMs);

    return () => {
      window.clearTimeout(leadTimer);
      window.clearTimeout(phaseTimer);
    };
  }, [activeAnimationMs, indicatorLeadMs, indicatorMode, isActive, isPast, pictorialAnimationMs, stepNumber]);

  const expectedGeometryKey = useMemo(() => {
    return `${stepNumber}-${phase}-${isActive ? 'A' : 'I'}`;
  }, [isActive, phase, stepNumber]);

  useLayoutEffect(() => {
    expectedGeometryKeyRef.current = expectedGeometryKey;
  }, [expectedGeometryKey]);

  // Reset geometry key before measuring so we never reuse stale rects for a new step/phase.
  useLayoutEffect(() => {
    if (indicatorMode !== 'pictorial' || !isActive) return;
    setMeasuredGeometry({ key: '', rects: {} });
    setValidatedGeometry({ key: '', rects: {} });
  }, [expectedGeometryKey, indicatorMode, isActive]);

  // Measure cell geometry so indicator arrows align and swap ghosts move cleanly.
  useLayoutEffect(() => {
    if (!cellsRef.current) return;

    const containerRect = cellsRef.current.getBoundingClientRect();
    const entries = Array.from(cellRefs.current.entries()).filter(([, el]) => Boolean(el)) as Array<[number, HTMLDivElement]>;
    if (entries.length === 0) return;

    const nextRects: Record<number, { left: number; top: number; width: number; height: number }> = {};
    for (const [idx, el] of entries) {
      const r = el.getBoundingClientRect();
      nextRects[idx] = {
        left: r.left - containerRect.left,
        top: r.top - containerRect.top,
        width: r.width,
        height: r.height,
      };
    }
    // Atomic update: the key and rects must always correspond.
    setMeasuredGeometry({ key: expectedGeometryKey, rects: nextRects });

    // Pictorial mode correctness: defer indicator geometry by one animation frame.
    // This avoids transient layout states (wrap/resize/font paint) that can briefly
    // make arrows appear to point at a neighboring index.
    if (indicatorMode === 'pictorial' && isActive) {
      const scheduledKey = expectedGeometryKey;
      window.requestAnimationFrame(() => {
        if (!cellsRef.current) return;
        if (expectedGeometryKeyRef.current !== scheduledKey) return;

        const containerRect2 = cellsRef.current.getBoundingClientRect();
        const entries2 = Array.from(cellRefs.current.entries()).filter(([, el]) => Boolean(el)) as Array<
          [number, HTMLDivElement]
        >;
        if (entries2.length === 0) return;

        const rects2: Record<number, { left: number; top: number; width: number; height: number }> = {};
        for (const [idx, el] of entries2) {
          const r = el.getBoundingClientRect();
          rects2[idx] = {
            left: r.left - containerRect2.left,
            top: r.top - containerRect2.top,
            width: r.width,
            height: r.height,
          };
        }

        setValidatedGeometry({ key: scheduledKey, rects: rects2 });
      });
    }

    const first = entries.find(([idx]) => idx === 0)?.[1] ?? entries[0]?.[1];
    if (first) {
      const r = first.getBoundingClientRect();
      setCellWidth(r.width);
    }

    // Best-effort gap detection (uses first two cells)
    const cell0 = entries.find(([idx]) => idx === 0)?.[1];
    const cell1 = entries.find(([idx]) => idx === 1)?.[1];
    if (cell0 && cell1) {
      const r0 = cell0.getBoundingClientRect();
      const r1 = cell1.getBoundingClientRect();
      const gap = Math.max(0, Math.round(r1.left - r0.right));
      setCellGap(gap);
    }
  }, [currentArray.length, expectedGeometryKey, indicatorMode, isActive, phase, stepNumber]);

  const indicatorGeometry = useMemo(() => {
    return indicatorMode === 'pictorial' ? validatedGeometry : measuredGeometry;
  }, [indicatorMode, measuredGeometry, validatedGeometry]);

  const comparePair = useMemo(() => {
    // Pictorial correctness: prefer explicit moveArrows indices over highlight arrays.
    // Highlights can represent transient emphasis and may momentarily disagree with the
    // intended arrow endpoints (most noticeable in Quick Sort).
    if (indicatorMode === 'pictorial' && compareArrow) {
      return compareArrow.fromIndex < compareArrow.toIndex
        ? { from: compareArrow.fromIndex, to: compareArrow.toIndex }
        : { from: compareArrow.toIndex, to: compareArrow.fromIndex };
    }

    const indices = (phase === 'after' ? step.highlights.after.compare : step.highlights.before.compare).slice();
    if (indices.length >= 2) {
      const a = indices[0];
      const b = indices[1];
      return a < b ? { from: a, to: b } : { from: b, to: a };
    }
    if (compareArrow) {
      return compareArrow.fromIndex < compareArrow.toIndex
        ? { from: compareArrow.fromIndex, to: compareArrow.toIndex }
        : { from: compareArrow.toIndex, to: compareArrow.fromIndex };
    }
    return null;
  }, [compareArrow, indicatorMode, phase, step.highlights.after.compare, step.highlights.before.compare]);

  // Avoid indicator flicker: only render arrows once we have measured cell geometry for the
  // relevant indices. Without this, MoveArrow can briefly use fallback sizing and point to
  // the wrong cells (most noticeable in Quick Sort steps).
  const compareGeometryReady = useMemo(() => {
    if (!comparePair) return false;
    if (indicatorGeometry.key !== expectedGeometryKey) return false;
    return Boolean(indicatorGeometry.rects[comparePair.from] && indicatorGeometry.rects[comparePair.to]);
  }, [comparePair, expectedGeometryKey, indicatorGeometry.key, indicatorGeometry.rects]);

  const swapGeometryReady = useMemo(() => {
    if (!swapArrow) return false;
    if (indicatorGeometry.key !== expectedGeometryKey) return false;
    return Boolean(indicatorGeometry.rects[swapArrow.fromIndex] && indicatorGeometry.rects[swapArrow.toIndex]);
  }, [expectedGeometryKey, indicatorGeometry.key, indicatorGeometry.rects, swapArrow]);

  const containerClassName = `relative p-2 md:p-3 rounded-lg ${stableLayout ? 'transition-none' : 'transition-all'} border-2 ${
    isActive
      ? 'bg-card border-primary/40 shadow-lg'
      : isPast
        ? 'bg-card/60 border-sorted/30'
        : 'bg-card/30 border-transparent'
  }`;

  const content = (
    <>
      {/* Step header - always visible, no horizontal scroll */}
      <div className={`flex items-center gap-2 mb-2 ${stableLayout ? 'min-h-10' : ''}`}>
        {/* Step number badge */}
        <div className={`shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${
          isActive 
            ? 'bg-primary text-primary-foreground' 
            : isPast 
              ? 'bg-sorted/20 text-sorted border border-sorted/40' 
              : 'bg-secondary text-muted-foreground'
        }`}>
          {isPast ? <Check className="w-3 h-3" /> : stepNumber}
        </div>
        
        {/* Step info - compact layout */}
        <div className="flex-1 min-w-0">
          <div className={`flex items-center gap-1.5 ${stableLayout ? 'flex-nowrap overflow-hidden' : 'flex-wrap'}`}>
            <span className={`text-[10px] font-mono ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              S{stepNumber}
            </span>
            {step.metrics.passes > 0 && (
              <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                isActive ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
              }`}>
                P{step.metrics.passes}
              </span>
            )}
          </div>
          <p className={`text-[11px] md:text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {step.label}
          </p>

          {isActive && isFullySorted && (
            <div className="mt-1">
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-sorted/20 text-sorted border border-sorted/50 text-[10px] md:text-xs font-semibold">
                <Check className="w-3.5 h-3.5" />
                Array fully sorted
              </span>
            </div>
          )}

          {/* Quick Sort info line (no overlay on cells) */}
          {useQuickSortLayout && isActive && quickMeta?.low != null && quickMeta?.high != null && (
            <div className="mt-1 min-h-5">
              <p className="text-[10px] text-muted-foreground">
                Active subarray <span className="font-mono">[{quickMeta.low}–{quickMeta.high}]</span>
                {quickMeta.pivotIndex != null ? (
                  <>
                    {' '}
                    • Pivot at <span className="font-mono">{quickMeta.pivotIndex}</span>
                  </>
                ) : null}
              </p>
            </div>
          )}
        </div>
      </div>

      {useMergeSortLayout && mergeMeta ? (
        <div
          className="relative rounded-xl border border-border bg-background/40 p-3 md:p-4 overflow-visible"
          style={{
            // Critical: keep Merge Sort visualization stable across Next/Previous.
            // Use a consistent height envelope so only inner tiles animate.
            minHeight: stableLayout ? 360 : undefined,
          }}
        >
          <div className="flex flex-col gap-3 md:gap-4">
            {/* Split / Merge stage header */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-[10px] md:text-xs font-semibold tracking-wide uppercase ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                  {mergeMeta.stage === 'divide' ? 'Split (Divide)' : mergeMeta.stage === 'merge' ? 'Merge (Prepare)' : mergeMeta.stage === 'merged' ? 'Merge Result' : 'Merge Sort'}
                </span>
                {mergeMeta.left != null && mergeMeta.right != null && (
                  <span className="text-[10px] md:text-xs font-mono text-muted-foreground">
                    Range [{mergeMeta.left}–{mergeMeta.right}]
                  </span>
                )}
              </div>
            </div>

            {/* Left / Right blocks */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
              {/* Left */}
              <div className="rounded-xl border border-border bg-card/60 p-3 overflow-visible">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground">
                    {mergeMeta.stage === 'divide' ? 'Left half' : 'Sorted Left'}
                  </span>
                  {mergeMeta.left != null && mergeMeta.mid != null && (
                    <span className="text-[10px] font-mono text-muted-foreground">[{mergeMeta.left}–{mergeMeta.mid}]</span>
                  )}
                </div>

                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                    {(() => {
                      const left = mergeMeta.left;
                      const mid = mergeMeta.mid;
                      if (left == null || mid == null) return null;
                      const indices = Array.from({ length: Math.max(0, mid - left + 1) }, (_, i) => left + i);
                      return indices.map((idx) => (
                        <div key={`ms-l-${stepNumber}-${idx}`} className="relative">
                          {mergeSources && mergeMeta.stage === 'merged' && isActive && phase === 'after' && mergeSources.sourceToPickIndex[idx] != null && (
                            <motion.div
                              className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-blue-500/40"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{
                                duration: 0.38,
                                ease: 'easeOut',
                                delay: (mergeSources.sourceToPickIndex[idx] * mergeSources.highlightDelayMs) / 1000,
                              }}
                            />
                          )}
                          <ArrayCell
                            value={currentArray[idx]}
                            index={idx}
                            highlights={currentHighlights}
                            pointers={{}}
                            enableLayout={indicatorMode !== 'pictorial'}
                            isSmall={!isActive}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>

              {/* Right */}
              <div className="rounded-xl border border-border bg-card/60 p-3 overflow-visible">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground">
                    {mergeMeta.stage === 'divide' ? 'Right half' : 'Sorted Right'}
                  </span>
                  {mergeMeta.mid != null && mergeMeta.right != null && (
                    <span className="text-[10px] font-mono text-muted-foreground">[{mergeMeta.mid + 1}–{mergeMeta.right}]</span>
                  )}
                </div>

                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1 flex-wrap justify-center">
                    {(() => {
                      const mid = mergeMeta.mid;
                      const right = mergeMeta.right;
                      if (mid == null || right == null) return null;
                      const start = mid + 1;
                      const indices = Array.from({ length: Math.max(0, right - start + 1) }, (_, i) => start + i);
                      return indices.map((idx) => (
                        <div key={`ms-r-${stepNumber}-${idx}`} className="relative">
                          {mergeSources && mergeMeta.stage === 'merged' && isActive && phase === 'after' && mergeSources.sourceToPickIndex[idx] != null && (
                            <motion.div
                              className="pointer-events-none absolute inset-0 rounded-lg ring-2 ring-purple-500/40"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: [0, 1, 0] }}
                              transition={{
                                duration: 0.38,
                                ease: 'easeOut',
                                delay: (mergeSources.sourceToPickIndex[idx] * mergeSources.highlightDelayMs) / 1000,
                              }}
                            />
                          )}
                          <ArrayCell
                            value={currentArray[idx]}
                            index={idx}
                            highlights={currentHighlights}
                            pointers={{}}
                            enableLayout={indicatorMode !== 'pictorial'}
                            isSmall={!isActive}
                          />
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Merge output row */}
            {mergeMeta.left != null && mergeMeta.right != null && (
              <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 md:p-4 overflow-visible">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <span className="text-xs font-semibold text-foreground">Merged output</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">[{mergeMeta.left}–{mergeMeta.right}]</span>
                    {mergeMeta.stage === 'merged' && mergeSources?.exhausted && (
                      <span className="text-[10px] text-muted-foreground">
                        {mergeSources.exhausted.side === 'L' ? 'Left exhausted → copy remaining Right' : 'Right exhausted → copy remaining Left'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative inline-flex items-center gap-1 flex-wrap justify-center" style={{ paddingTop: 22 }}>
                    {(() => {
                      const left = mergeMeta.left as number;
                      const right = mergeMeta.right as number;
                      const len = right - left + 1;
                      const outputValues = step.after.slice(left, right + 1);

                      // Stable structure: always render slots.
                      // Teaching-first: only fill once the merge result exists.
                      const showFilled = mergeMeta.stage === 'merged' && (isPast || (isActive && phase === 'after'));
                      const showAnimated = mergeMeta.stage === 'merged' && isActive && phase === 'after';

                      return Array.from({ length: len }, (_, t) => {
                        const v = outputValues[t];
                        const src = mergeSources?.picks[t] ?? null;
                        const fromX = src === 'L' ? -12 : src === 'R' ? 12 : 0;

                        if (!showFilled) {
                          return (
                            <div
                              key={`ms-out-empty-${stepNumber}-${t}`}
                              className="array-cell array-cell-default opacity-25"
                              style={{ width: isActive ? undefined : 32, height: isActive ? undefined : 32 }}
                            />
                          );
                        }

                        const cell = (
                          <div className="relative" key={`ms-out-${stepNumber}-${t}`}
                          >
                            <motion.div
                              initial={showAnimated ? { opacity: 0, y: -8, x: fromX } : false}
                              animate={{ opacity: 1, y: 0, x: 0 }}
                              transition={{
                                duration: 0.38,
                                ease: 'easeOut',
                                delay: showAnimated ? t * 0.12 : 0,
                              }}
                            >
                              <ArrayCell
                                value={v}
                                index={left + t}
                                highlights={currentHighlights}
                                pointers={{}}
                                enableLayout={false}
                                isSmall={!isActive}
                              />
                            </motion.div>
                          </div>
                        );

                        return cell;
                      });
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : useQuickSortLayout && quickMeta ? (
        <div
          className="relative rounded-xl border border-border bg-background/40 p-3 md:p-4 overflow-visible"
          style={{ minHeight: stableLayout ? 360 : undefined }}
        >
          <div className="flex flex-col gap-3">
            {/* Comparison cue (simple, readable) */}
            {isActive && step.label.startsWith('Compare with Pivot') && quickMeta.j != null && quickMeta.pivotIndex != null && (
              <p className="text-xs text-muted-foreground">
                Compare <span className="font-mono">arr[{quickMeta.j}]</span> with <span className="font-semibold">Pivot</span>
              </p>
            )}

            {isActive && (step.label === 'Swap' || step.label === 'No Swap / Skip' || step.label.startsWith('Pivot Placement')) && (
              <p className="text-xs text-muted-foreground">
                {step.label === 'Swap'
                  ? 'Move this element to the Left side'
                  : step.label === 'No Swap / Skip'
                    ? 'This element stays on the Right side'
                    : 'Place Pivot into its correct position'}
              </p>
            )}

            {/* Cells + simple structure live in ONE measurement container (so arrows/swaps work). */}
            <div ref={rowRef} className="relative" style={{ paddingBottom: 34 }}>
              <div className="flex justify-center">
                <div ref={cellsRef} className="relative w-full" style={{ maxWidth: 860 }}>
                  {/* 3-box pivot division (obvious, structural) */}
                  {quickMeta.pivotIndex != null && quickMeta.low != null && quickMeta.high != null ? (
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] gap-3 items-start">
                      {/* Left */}
                      <div className="rounded-xl border border-border bg-card/60 p-3 overflow-visible">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-foreground">Left (&lt; Pivot)</span>
                          <span className="text-[10px] font-mono text-muted-foreground">[{quickMeta.low}–{Math.max(quickMeta.low, quickMeta.pivotIndex - 1)}]</span>
                        </div>
                        <div className="flex justify-center">
                          <div className="inline-flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: '100%' }}>
                            {Array.from({ length: Math.max(0, quickMeta.pivotIndex - quickMeta.low) }, (_, t) => quickMeta.low! + t).map((idx) => (
                              <ArrayCell
                                key={`qs-left-${stepNumber}-${idx}`}
                                value={currentArray[idx]}
                                index={idx}
                                highlights={effectiveHighlights}
                                pointers={{}}
                                enableLayout={indicatorMode !== 'pictorial'}
                                isSmall={!isActive}
                                dimmed={mergedDimIndices.has(idx) || quickCompareFocusDim.has(idx)}
                                cellRef={(el) => {
                                  cellRefs.current.set(idx, el);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Pivot (fixed center) */}
                      <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 overflow-visible">
                        <div className="flex items-center justify-center mb-2">
                          <span className="text-xs font-semibold text-foreground">Pivot</span>
                        </div>
                        <div className="flex justify-center">
                          <ArrayCell
                            key={`qs-pivot-${stepNumber}-${quickMeta.pivotIndex}`}
                            value={currentArray[quickMeta.pivotIndex]}
                            index={quickMeta.pivotIndex}
                            highlights={effectiveHighlights}
                            pointers={{}}
                            enableLayout={indicatorMode !== 'pictorial'}
                            isSmall={!isActive}
                            dimmed={mergedDimIndices.has(quickMeta.pivotIndex) || quickCompareFocusDim.has(quickMeta.pivotIndex)}
                            cellRef={(el) => {
                              cellRefs.current.set(quickMeta.pivotIndex!, el);
                            }}
                          />
                        </div>
                      </div>

                      {/* Right */}
                      <div className="rounded-xl border border-border bg-card/60 p-3 overflow-visible">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs font-semibold text-foreground">Right (&gt; Pivot)</span>
                          <span className="text-[10px] font-mono text-muted-foreground">[{Math.min(quickMeta.high, quickMeta.pivotIndex + 1)}–{quickMeta.high}]</span>
                        </div>
                        <div className="flex justify-center">
                          <div className="inline-flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: '100%' }}>
                            {Array.from({ length: Math.max(0, quickMeta.high - quickMeta.pivotIndex) }, (_, t) => quickMeta.pivotIndex! + 1 + t).map((idx) => (
                              <ArrayCell
                                key={`qs-right-${stepNumber}-${idx}`}
                                value={currentArray[idx]}
                                index={idx}
                                highlights={effectiveHighlights}
                                pointers={{}}
                                enableLayout={indicatorMode !== 'pictorial'}
                                isSmall={!isActive}
                                dimmed={mergedDimIndices.has(idx) || quickCompareFocusDim.has(idx)}
                                cellRef={(el) => {
                                  cellRefs.current.set(idx, el);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // Recursive steps: show only the active subarray in one simple box.
                    <div className="rounded-xl border border-border bg-card/60 p-3 overflow-visible">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-foreground">Active subarray</span>
                        {quickMeta.low != null && quickMeta.high != null && (
                          <span className="text-[10px] font-mono text-muted-foreground">[{quickMeta.low}–{quickMeta.high}]</span>
                        )}
                      </div>
                      <div className="flex justify-center">
                        <div className="inline-flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: '100%' }}>
                          {quickMeta.low != null && quickMeta.high != null && quickMeta.low <= quickMeta.high ? (
                            Array.from({ length: quickMeta.high - quickMeta.low + 1 }, (_, t) => quickMeta.low! + t).map((idx) => (
                              <ArrayCell
                                key={`qs-active-${stepNumber}-${idx}`}
                                value={currentArray[idx]}
                                index={idx}
                                highlights={effectiveHighlights}
                                pointers={{}}
                                enableLayout={indicatorMode !== 'pictorial'}
                                isSmall={!isActive}
                                dimmed={mergedDimIndices.has(idx)}
                                cellRef={(el) => {
                                  cellRefs.current.set(idx, el);
                                }}
                              />
                            ))
                          ) : (
                            <span className="text-xs text-muted-foreground">Base case (size ≤ 1)</span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Simple compare line (between current element and pivot) */}
                  {isActive && showArrows && hasCompare && comparePair && compareGeometryReady && (
                    <div
                      key={`qs-compare-${stepNumber}-${comparePair.from}-${comparePair.to}-${phase}`}
                      className="pointer-events-none"
                      style={{ opacity: 1 }}
                    >
                      {(() => {
                        const fromRect = indicatorGeometry.rects[comparePair.from];
                        const toRect = indicatorGeometry.rects[comparePair.to];
                        if (!fromRect || !toRect) return null;

                        const startX = fromRect.left + fromRect.width / 2;
                        const endX = toRect.left + toRect.width / 2;
                        const y = 14;

                        return (
                          <svg
                            className="absolute top-full left-0 w-full h-10 overflow-visible"
                            aria-hidden
                          >
                            <defs>
                              <marker
                                id={`qs-arrowhead-${stepNumber}`}
                                markerWidth="8"
                                markerHeight="8"
                                refX="6"
                                refY="4"
                                orient="auto"
                              >
                                <path d="M 0 0 L 8 4 L 0 8 z" fill="hsl(var(--compare))" />
                              </marker>
                            </defs>
                            <line
                              x1={startX}
                              y1={y}
                              x2={endX}
                              y2={y}
                              stroke="hsl(var(--compare))"
                              strokeWidth={2}
                              strokeLinecap="round"
                              markerEnd={`url(#qs-arrowhead-${stepNumber})`}
                            />
                          </svg>
                        );
                      })()}
                    </div>
                  )}

                  {/* Simple swap move (no extra effects) */}
                  {isActive && showArrows && swapArrow && phase === 'before' && (indicatorMode !== 'pictorial' || animationsEnabled) && (
                    <motion.div
                      key={`qs-swap-ghost-${stepNumber}-${swapArrow.fromIndex}-${swapArrow.toIndex}`}
                      className="pointer-events-none absolute inset-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      {(() => {
                        const fromRect = measuredGeometry.rects[swapArrow.fromIndex];
                        const toRect = measuredGeometry.rects[swapArrow.toIndex];
                        if (!fromRect || !toRect) return null;

                        const fromValue = step.before[swapArrow.fromIndex];
                        const toValue = step.before[swapArrow.toIndex];

                        // If the generator emits no arrow for i===j, skip ghost.
                        if (swapArrow.fromIndex === swapArrow.toIndex) return null;

                        return (
                          <>
                            <motion.div
                              className="absolute array-cell array-cell-swap"
                              style={{ left: fromRect.left, top: fromRect.top, width: fromRect.width, height: fromRect.height }}
                              animate={{ left: toRect.left, top: toRect.top }}
                              transition={{ duration: activeAnimationMs / 1000, ease: [0.22, 1, 0.36, 1] }}
                            >
                              {fromValue}
                            </motion.div>
                            <motion.div
                              className="absolute array-cell array-cell-swap"
                              style={{ left: toRect.left, top: toRect.top, width: toRect.width, height: toRect.height }}
                              animate={{ left: fromRect.left, top: fromRect.top }}
                              transition={{ duration: activeAnimationMs / 1000, ease: [0.22, 1, 0.36, 1] }}
                            >
                              {toValue}
                            </motion.div>
                          </>
                        );
                      })()}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>

            {/* Completed pivots (faded, simple context) */}
            {effectiveHighlights.sorted.length > 0 && (
              <div
                className={
                  'rounded-xl border p-3 ' +
                  (isFullySorted
                    ? 'border-sorted/50 bg-sorted/10 shadow-[0_0_0_1px_hsl(var(--sorted)_/_0.12)_inset]'
                    : 'border-border bg-card/40')
                }
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-semibold text-foreground">Fixed (done)</span>
                  <span className={"text-[10px] " + (isFullySorted ? 'text-sorted font-semibold' : 'text-muted-foreground')}>
                    {isFullySorted ? 'final' : 'faded'}
                  </span>
                </div>
                <div className="flex justify-center">
                  <div className="inline-flex items-center gap-1 flex-wrap justify-center" style={{ maxWidth: '100%' }}>
                    {effectiveHighlights.sorted.map((idx) => (
                      <ArrayCell
                        key={`qs-fixed-${stepNumber}-${idx}`}
                        value={currentArray[idx]}
                        index={idx}
                        highlights={{ ...emptyHighlightsForView, sorted: [idx] }}
                        pointers={{}}
                        enableLayout={false}
                        isSmall={true}
                        dimmed={!isFullySorted}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Single array row (no duplicated before/after). Animations happen as overlays. */
        <div
          ref={rowRef}
          className="relative"
          style={{
            // Reserve space so pointer labels above and indicators below never shift layout.
            // When stableLayout is enabled (used by the visualizer), keep this identical across
            // active/inactive rows so Next/Previous never causes layout reflow.
            paddingTop: stableLayout ? 28 : isActive ? 28 : 22,
            paddingBottom: stableLayout ? 34 : isActive ? 34 : 28,
            minHeight: stableLayout ? 96 : isActive ? 96 : 84,
          }}
        >
          <div className="flex justify-center">
            <div
              ref={cellsRef}
              className={`relative inline-flex items-center gap-1 ${isActive ? 'flex-nowrap' : 'flex-wrap justify-center'}`}
              style={{ maxWidth: '100%' }}
            >
            {indicatorMode === 'pictorial' ? (
              <>
                {currentArray.map((value, index) => (
                  <ArrayCell
                    key={`cell-${stepNumber}-${index}`}
                    value={value}
                    index={index}
                    highlights={effectiveHighlights}
                    pointers={effectivePointersForRow}
                    enableLayout={false}
                    isSmall={!isActive}
                    dimmed={mergedDimIndices.has(index)}
                    cellRef={(el) => {
                      cellRefs.current.set(index, el);
                    }}
                  />
                ))}
              </>
            ) : (
              <AnimatePresence mode="popLayout">
                {currentArray.map((value, index) => (
                  <ArrayCell
                    key={`cell-${stepNumber}-${index}`}
                    value={value}
                    index={index}
                    highlights={effectiveHighlights}
                    pointers={effectivePointersForRow}
                    enableLayout={true}
                    isSmall={!isActive}
                    dimmed={mergedDimIndices.has(index)}
                    cellRef={(el) => {
                      cellRefs.current.set(index, el);
                    }}
                  />
                ))}
              </AnimatePresence>
            )}

          {/* Indicator overlays (below the cells) */}
          {isActive && showArrows && (
            indicatorMode === 'pictorial' ? (
              <>
                {/* Pictorial correctness: no exit overlap and no draw-sweep. Render only when validated geometry is ready. */}
                {hasCompare && comparePair && compareGeometryReady && (
                  <motion.div
                    key={`compare-${stepNumber}-${comparePair.from}-${comparePair.to}-${phase}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {(() => {
                      const fromRect = indicatorGeometry.rects[comparePair.from];
                      const toRect = indicatorGeometry.rects[comparePair.to];
                      if (!fromRect || !toRect) return null;
                      return (
                        <MoveArrow
                          arrow={{ fromIndex: comparePair.from, toIndex: comparePair.to, type: 'compare' }}
                          cellWidth={cellWidth}
                          cellGap={cellGap}
                          fromX={fromRect.left + fromRect.width / 2}
                          toX={toRect.left + toRect.width / 2}
                          animateDraw={false}
                        />
                      );
                    })()}
                  </motion.div>
                )}

                {hasSwap && swapArrow && phase === 'before' && swapGeometryReady && (
                  <motion.div
                    key={`swap-ind-${stepNumber}-${swapArrow.fromIndex}-${swapArrow.toIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    {(() => {
                      const fromRect = indicatorGeometry.rects[swapArrow.fromIndex];
                      const toRect = indicatorGeometry.rects[swapArrow.toIndex];
                      if (!fromRect || !toRect) return null;
                      const a = fromRect.left + fromRect.width / 2;
                      const b = toRect.left + toRect.width / 2;
                      return (
                        <>
                          <MoveArrow
                            arrow={{ fromIndex: swapArrow.fromIndex, toIndex: swapArrow.toIndex, type: 'swap' }}
                            cellWidth={cellWidth}
                            cellGap={cellGap}
                            fromX={a}
                            toX={b}
                            animateDraw={false}
                          />
                          <MoveArrow
                            arrow={{ fromIndex: swapArrow.toIndex, toIndex: swapArrow.fromIndex, type: 'swap' }}
                            cellWidth={cellWidth}
                            cellGap={cellGap}
                            fromX={b}
                            toX={a}
                            animateDraw={false}
                          />
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </>
            ) : (
              <AnimatePresence>
                {hasCompare && comparePair && compareGeometryReady && (
                  <motion.div
                    key={`compare-${stepNumber}-${comparePair.from}-${comparePair.to}-${phase}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {(() => {
                      const fromRect = indicatorGeometry.rects[comparePair.from];
                      const toRect = indicatorGeometry.rects[comparePair.to];
                      if (!fromRect || !toRect) return null;
                      return (
                        <MoveArrow
                          arrow={{ fromIndex: comparePair.from, toIndex: comparePair.to, type: 'compare' }}
                          cellWidth={cellWidth}
                          cellGap={cellGap}
                          fromX={fromRect.left + fromRect.width / 2}
                          toX={toRect.left + toRect.width / 2}
                          animateDraw={true}
                        />
                      );
                    })()}
                  </motion.div>
                )}

                {hasSwap && swapArrow && phase === 'before' && swapGeometryReady && (
                  <motion.div
                    key={`swap-ind-${stepNumber}-${swapArrow.fromIndex}-${swapArrow.toIndex}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {(() => {
                      const fromRect = indicatorGeometry.rects[swapArrow.fromIndex];
                      const toRect = indicatorGeometry.rects[swapArrow.toIndex];
                      if (!fromRect || !toRect) return null;
                      const a = fromRect.left + fromRect.width / 2;
                      const b = toRect.left + toRect.width / 2;
                      return (
                        <>
                          <MoveArrow
                            arrow={{ fromIndex: swapArrow.fromIndex, toIndex: swapArrow.toIndex, type: 'swap' }}
                            cellWidth={cellWidth}
                            cellGap={cellGap}
                            fromX={a}
                            toX={b}
                            animateDraw={true}
                          />
                          <MoveArrow
                            arrow={{ fromIndex: swapArrow.toIndex, toIndex: swapArrow.fromIndex, type: 'swap' }}
                            cellWidth={cellWidth}
                            cellGap={cellGap}
                            fromX={b}
                            toX={a}
                            animateDraw={true}
                          />
                        </>
                      );
                    })()}
                  </motion.div>
                )}
              </AnimatePresence>
            )
          )}

          {/* Swap ghost animation: overlay moving cells, then settle into new values */}
          {isActive && showArrows && swapArrow && phase === 'before' && (indicatorMode !== 'pictorial' || animationsEnabled) && (
            indicatorMode === 'pictorial' ? (
              <motion.div
                key={`swap-ghost-${stepNumber}-${swapArrow.fromIndex}-${swapArrow.toIndex}`}
                className="pointer-events-none absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {(() => {
                  const fromRect = measuredGeometry.rects[swapArrow.fromIndex];
                  const toRect = measuredGeometry.rects[swapArrow.toIndex];
                  if (!fromRect || !toRect) return null;

                  const fromValue = step.before[swapArrow.fromIndex];
                  const toValue = step.before[swapArrow.toIndex];

                  return (
                    <>
                      <motion.div
                        className="absolute array-cell array-cell-swap"
                        style={{
                          left: fromRect.left,
                          top: fromRect.top,
                          width: fromRect.width,
                          height: fromRect.height,
                        }}
                        initial={{ scale: 1, filter: 'brightness(1)' }}
                        animate={{
                          left: toRect.left,
                          top: toRect.top,
                          scale: [1, 1.08, 1],
                          filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'],
                        }}
                        transition={{
                          duration: activeAnimationMs / 1000,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {fromValue}
                      </motion.div>
                      <motion.div
                        className="absolute array-cell array-cell-swap"
                        style={{
                          left: toRect.left,
                          top: toRect.top,
                          width: toRect.width,
                          height: toRect.height,
                        }}
                        initial={{ scale: 1, filter: 'brightness(1)' }}
                        animate={{
                          left: fromRect.left,
                          top: fromRect.top,
                          scale: [1, 1.08, 1],
                          filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'],
                        }}
                        transition={{
                          duration: activeAnimationMs / 1000,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                      >
                        {toValue}
                      </motion.div>
                    </>
                  );
                })()}
              </motion.div>
            ) : (
              <AnimatePresence>
                <motion.div
                  key={`swap-ghost-${stepNumber}-${swapArrow.fromIndex}-${swapArrow.toIndex}`}
                  className="pointer-events-none absolute inset-0"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {(() => {
                    const fromRect = measuredGeometry.rects[swapArrow.fromIndex];
                    const toRect = measuredGeometry.rects[swapArrow.toIndex];
                    if (!fromRect || !toRect) return null;

                    const fromValue = step.before[swapArrow.fromIndex];
                    const toValue = step.before[swapArrow.toIndex];

                    return (
                      <>
                        <motion.div
                          className="absolute array-cell array-cell-swap"
                          style={{
                            left: fromRect.left,
                            top: fromRect.top,
                            width: fromRect.width,
                            height: fromRect.height,
                          }}
                          initial={{ scale: 1, filter: 'brightness(1)' }}
                          animate={{
                            left: toRect.left,
                            top: toRect.top,
                            scale: [1, 1.08, 1],
                            filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'],
                          }}
                          transition={{
                            duration: activeAnimationMs / 1000,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          {fromValue}
                        </motion.div>

                        <motion.div
                          className="absolute array-cell array-cell-swap"
                          style={{
                            left: toRect.left,
                            top: toRect.top,
                            width: toRect.width,
                            height: toRect.height,
                          }}
                          initial={{ scale: 1, filter: 'brightness(1)' }}
                          animate={{
                            left: fromRect.left,
                            top: fromRect.top,
                            scale: [1, 1.08, 1],
                            filter: ['brightness(1)', 'brightness(1.15)', 'brightness(1)'],
                          }}
                          transition={{
                            duration: activeAnimationMs / 1000,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                        >
                          {toValue}
                        </motion.div>
                      </>
                    );
                  })()}
                </motion.div>
              </AnimatePresence>
            )
          )}
            </div>
          </div>
        </div>
      )}

      {/* Explanation moved to Focus mode card - no duplicate here */}
    </>
  );

  if (stableLayout) {
    return (
      <div
        className={containerClassName}
        style={{
          opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
          // Keep row height stable so the pictorial indicator never resizes/jitters.
          minHeight: useMergeSortLayout ? 360 : useQuickSortLayout ? 360 : 156,
        }}
      >
        {content}
      </div>
    );
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{
        opacity: isActive ? 1 : isPast ? 0.7 : 0.4,
        x: 0,
        scale: isActive ? 1 : 0.97,
      }}
      exit={{ opacity: 0, x: 20 }}
      className={containerClassName}
    >
      {content}
    </motion.div>
  );
};