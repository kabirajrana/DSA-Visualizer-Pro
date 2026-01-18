import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { AlgorithmType, Highlights, Step } from '@/lib/stepTypes';
import { ArrayCell } from './ArrayCell';
import { MoveArrow } from './MoveArrow';

interface StepRowProps {
  step: Step;
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

  const dimIndices = useMemo(() => {
    if (!isActive || !showArrows || !hasSwap || phase !== 'before' || !swapArrow) return new Set<number>();
    if (indicatorMode === 'pictorial' && !animationsEnabled) return new Set<number>();
    return new Set([swapArrow.fromIndex, swapArrow.toIndex]);
  }, [animationsEnabled, hasSwap, indicatorMode, isActive, phase, showArrows, swapArrow]);

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
        </div>
      </div>

      {/* Single array row (no duplicated before/after). Animations happen as overlays. */}
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
                  highlights={currentHighlights}
                  pointers={pointersForRow}
                  enableLayout={false}
                  isSmall={!isActive}
                  dimmed={dimIndices.has(index)}
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
                  highlights={currentHighlights}
                  pointers={pointersForRow}
                  enableLayout={true}
                  isSmall={!isActive}
                  dimmed={dimIndices.has(index)}
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
          minHeight: 156,
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