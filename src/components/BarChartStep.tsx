import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import type { Highlights, Step } from '@/lib/stepTypes';

type Phase = 'before' | 'after';

interface BarChartStepProps {
  step: Step;
  stepIndex: number; // 0-based
  playbackSpeedMs: number;
  showExplanation?: boolean;
  barAreaPx?: number;
  axisAreaPx?: number;
  density?: 'normal' | 'dense';
  allowHorizontalScroll?: boolean;
}

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];
const BAR_AREA_PX = 240;
const AXIS_AREA_PX = 48;
const MIN_BAR_PX = 8;
// < 1 boosts small values so bars don't disappear.
const HEIGHT_EXPONENT = 0.75;

const getPointerColor = (name: string): string => {
  const colors: Record<string, string> = {
    i: 'bg-primary text-primary-foreground',
    j: 'bg-accent text-accent-foreground',
    key: 'bg-blue-500 text-white',
    low: 'bg-green-500 text-white',
    high: 'bg-red-500 text-white',
    mid: 'bg-yellow-500 text-black',
    pivot: 'bg-orange-500 text-white',
    result: 'bg-green-500 text-white',
    target: 'bg-purple-500 text-white',
    minIdx: 'bg-blue-500 text-white',
    pos: 'bg-yellow-500 text-black',
    curr: 'bg-blue-500 text-white',
    prev: 'bg-muted text-muted-foreground',
    left: 'bg-blue-500 text-white',
    right: 'bg-purple-500 text-white',
    parent: 'bg-accent text-accent-foreground',
    child: 'bg-red-500 text-white',
    max: 'bg-orange-500 text-white',
    end: 'bg-muted text-muted-foreground',
    start: 'bg-green-500 text-white',
  };
  return colors[name] || 'bg-muted text-muted-foreground';
};

const getActivePointersForIndex = (pointers: Record<string, number | null>, index: number): string[] => {
  return Object.entries(pointers)
    .filter(([, idx]) => idx === index)
    .map(([name]) => (name === 'minIdx' ? 'minIndex' : name));
};

const pickBarIndicator = (
  index: number,
  highlights: Highlights,
  activePointers: string[],
): { dim?: boolean; ring?: string; overlay?: string; fill?: string } => {
  if (highlights.eliminated.includes(index)) return { dim: true };

  // Priority: found > swap > compare > pivot > key > sorted > shift > pointer
  if (highlights.found.includes(index)) return { ring: 'ring-2 ring-found', overlay: 'bg-found/10', fill: 'bg-found/65' };
  if (highlights.swap.includes(index)) return { ring: 'ring-2 ring-swap', overlay: 'bg-swap/10', fill: 'bg-swap/65' };
  if (highlights.compare.includes(index)) return { ring: 'ring-2 ring-compare', overlay: 'bg-compare/10', fill: 'bg-compare/65' };
  if (highlights.pivot.includes(index)) return { ring: 'ring-2 ring-pivot', overlay: 'bg-pivot/10', fill: 'bg-pivot/65' };
  if (highlights.key.includes(index)) return { ring: 'ring-2 ring-key', overlay: 'bg-key/10', fill: 'bg-key/65' };
  if (highlights.sorted.includes(index)) return { ring: 'ring-2 ring-sorted', overlay: 'bg-sorted/10', fill: 'bg-sorted/55' };
  if (highlights.shift.includes(index)) return { ring: 'ring-2 ring-shift', overlay: 'bg-shift/10', fill: 'bg-shift/60' };
  if (activePointers.length > 0) return { ring: 'ring-1 ring-primary/40', overlay: 'bg-primary/5', fill: 'bg-sky-200/80' };
  return { fill: 'bg-sky-200/80' };
};

const getCompareArrow = (step: Step) => step.moveArrows.find((a) => a.type === 'compare') ?? null;
const getSwapArrow = (step: Step) => step.moveArrows.find((a) => a.type === 'swap') ?? null;

export const BarChartStep: React.FC<BarChartStepProps> = ({
  step,
  stepIndex,
  playbackSpeedMs,
  showExplanation = true,
  barAreaPx = BAR_AREA_PX,
  axisAreaPx = AXIS_AREA_PX,
  density = 'normal',
  allowHorizontalScroll = true,
}) => {
  const [phase, setPhase] = useState<Phase>('before');
  const [animationsEnabled, setAnimationsEnabled] = useState(false);

  const barsAreaRef = useRef<HTMLDivElement | null>(null);
  const expectedGeometryKeyRef = useRef<string>('');
  const [geometry, setGeometry] = useState<{
    key: string;
    rects: Record<number, { left: number; width: number }>;
  }>({ key: '', rects: {} });

  const swapArrow = useMemo(() => getSwapArrow(step), [step]);
  const compareArrow = useMemo(() => getCompareArrow(step), [step]);

  const expectedKey = useMemo(() => `${stepIndex}-${phase}`, [phase, stepIndex]);
  useLayoutEffect(() => {
    expectedGeometryKeyRef.current = expectedKey;
  }, [expectedKey]);

  // Visual-only timing: slow and readable.
  const { leadMs, swapMs, settleMs } = useMemo(() => {
    const base = Math.max(1200, Math.min(2200, Math.round(playbackSpeedMs * 1.1)));
    return {
      leadMs: 180,
      swapMs: base + 450,
      settleMs: base,
    };
  }, [playbackSpeedMs]);

  // Strict order per step: indicator -> (optional) swap animation -> settle to after.
  useEffect(() => {
    setPhase('before');
    setAnimationsEnabled(false);
    const t1 = window.setTimeout(() => setAnimationsEnabled(true), leadMs);
    const t2 = window.setTimeout(() => setPhase('after'), leadMs + (swapArrow ? swapMs : settleMs));
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [leadMs, settleMs, stepIndex, swapArrow, swapMs]);

  const array = phase === 'after' ? step.after : step.before;
  const highlights = phase === 'after' ? step.highlights.after : step.highlights.before;

  const maxValue = useMemo(() => {
    const m = array.reduce((acc, v) => Math.max(acc, v), 1);
    return m <= 0 ? 1 : m;
  }, [array]);

  const calcBarHeightPx = (value: number) => {
    const ratio = maxValue <= 0 ? 0 : Math.max(0, value) / maxValue;
    const boosted = Math.pow(ratio, HEIGHT_EXPONENT);
    return Math.max(MIN_BAR_PX, Math.round(boosted * barAreaPx));
  };

  const barStateForIndex = (index: number, h: Highlights) => {
    if (h.found.includes(index)) return 'found' as const;
    if (h.swap.includes(index)) return 'swap' as const;
    if (h.compare.includes(index)) return 'compare' as const;
    if (h.pivot.includes(index)) return 'pivot' as const;
    if (h.key.includes(index)) return 'key' as const;
    if (h.sorted.includes(index)) return 'sorted' as const;
    if (h.shift.includes(index)) return 'shift' as const;
    return 'none' as const;
  };

  const glowColorForState = (state: ReturnType<typeof barStateForIndex>) => {
    const map: Record<typeof state, string> = {
      found: 'hsl(var(--found) / 0.45)',
      swap: 'hsl(var(--swap) / 0.45)',
      compare: 'hsl(var(--compare) / 0.45)',
      pivot: 'hsl(var(--pivot) / 0.45)',
      key: 'hsl(var(--key) / 0.45)',
      sorted: 'hsl(var(--sorted) / 0.35)',
      shift: 'hsl(var(--shift) / 0.40)',
      none: 'transparent',
    };
    return map[state];
  };

  // Measure bar slot geometry (for swap ghost overlay) and validate on next frame.
  useLayoutEffect(() => {
    if (!barsAreaRef.current) return;
    setGeometry({ key: '', rects: {} });

    const container = barsAreaRef.current;
    const measure = () => {
      if (!barsAreaRef.current) return;
      const containerRect = container.getBoundingClientRect();
      const nodes = Array.from(container.querySelectorAll('[data-bar-index]')) as HTMLElement[];
      const rects: Record<number, { left: number; width: number }> = {};
      for (const el of nodes) {
        const idx = Number(el.getAttribute('data-bar-index'));
        if (!Number.isFinite(idx)) continue;
        const r = el.getBoundingClientRect();
        rects[idx] = { left: r.left - containerRect.left, width: r.width };
      }
      setGeometry({ key: expectedKey, rects });
    };

    // Two-frame measure prevents transient flex reflow flashes.
    window.requestAnimationFrame(() => {
      if (expectedGeometryKeyRef.current !== expectedKey) return;
      window.requestAnimationFrame(() => {
        if (expectedGeometryKeyRef.current !== expectedKey) return;
        measure();
      });
    });
  }, [array.length, expectedKey]);

  const swapGhostReady = useMemo(() => {
    if (!swapArrow) return false;
    if (geometry.key !== expectedKey) return false;
    return Boolean(geometry.rects[swapArrow.fromIndex] && geometry.rects[swapArrow.toIndex]);
  }, [expectedKey, geometry.key, geometry.rects, swapArrow]);

  return (
    <div className="w-full">
      <div className="rounded-xl border border-border bg-muted/20 p-4 md:p-5">
        {/* Bars area */}
        <div
          ref={barsAreaRef}
          className="relative"
          style={{
            height: barAreaPx + axisAreaPx + 24,
          }}
        >
          {/* Baseline */}
          <div
            className="absolute left-0 right-0"
            style={{
              bottom: axisAreaPx,
              height: 2,
              background: 'linear-gradient(to right, transparent, hsl(var(--border)), transparent)',
            }}
          />

          {/* Swap ghost overlay: bars exchange positions smoothly (UI-only) */}
          {swapArrow && phase === 'before' && animationsEnabled && swapGhostReady && (
            <div className="pointer-events-none absolute inset-x-0" style={{ bottom: axisAreaPx, height: barAreaPx }}>
              {(() => {
                const a = geometry.rects[swapArrow.fromIndex];
                const b = geometry.rects[swapArrow.toIndex];
                if (!a || !b) return null;

                const fromValue = step.before[swapArrow.fromIndex];
                const toValue = step.before[swapArrow.toIndex];
                const fromH = calcBarHeightPx(fromValue);
                const toH = calcBarHeightPx(toValue);

                return (
                  <>
                    <motion.div
                      className="absolute bottom-0 rounded-md bg-sky-200/85 ring-2 ring-swap shadow-sm"
                      style={{ left: a.left, width: a.width, height: fromH }}
                      initial={false}
                      animate={{ left: b.left, height: toH }}
                      transition={{ duration: swapMs / 1000, ease }}
                    />
                    <motion.div
                      className="absolute bottom-0 rounded-md bg-sky-200/85 ring-2 ring-swap shadow-sm"
                      style={{ left: b.left, width: b.width, height: toH }}
                      initial={false}
                      animate={{ left: a.left, height: fromH }}
                      transition={{ duration: swapMs / 1000, ease }}
                    />
                  </>
                );
              })()}
            </div>
          )}

          <div
            className="absolute inset-x-0"
            style={{
              bottom: axisAreaPx,
              height: barAreaPx,
              overflowX: allowHorizontalScroll ? 'auto' : 'hidden',
              overflowY: 'visible',
            }}
          >
            <div
              className="flex items-end px-1"
              style={{
                height: barAreaPx,
                gap: 'clamp(4px, 0.9vw, 10px)',
                minWidth:
                  allowHorizontalScroll && array.length > 0
                    ? Math.max(0, array.length * (density === 'dense' ? 18 : 22))
                    : undefined,
              }}
            >
              {array.map((value, index) => {
              const pointers = getActivePointersForIndex(step.pointers, index);
              const indicator = pickBarIndicator(index, highlights, pointers);
              const h = calcBarHeightPx(value);
              const state = barStateForIndex(index, highlights);
              const glowColor = glowColorForState(state);

              const isStrongHighlight =
                highlights.compare.includes(index) ||
                highlights.swap.includes(index) ||
                highlights.pivot.includes(index) ||
                highlights.key.includes(index) ||
                highlights.found.includes(index) ||
                highlights.sorted.includes(index);

              // In a swap step while the ghost overlay is animating, keep the base bars dimmed
              // so the movement reads clearly.
              const isSwapGhostActive = Boolean(swapArrow && phase === 'before' && animationsEnabled);
              const isSwapIndex = Boolean(
                swapArrow &&
                  phase === 'before' &&
                  animationsEnabled &&
                  (index === swapArrow.fromIndex || index === swapArrow.toIndex),
              );
              const dimBecauseSwapGhost = isSwapGhostActive && !isSwapIndex;

              const minW =
                density === 'dense'
                  ? 'min-w-[10px] sm:min-w-[12px] md:min-w-[14px]'
                  : 'min-w-[14px] sm:min-w-[18px] md:min-w-[22px]';

              return (
                <div
                  key={`slot-${stepIndex}-${index}`}
                  data-bar-index={index}
                  className={`relative flex-1 ${minW}`}
                  style={{ height: barAreaPx }}
                >
                  {/* Pointer chips */}
                  {pointers.length > 0 && (
                    <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex gap-0.5 z-10">
                      {pointers.map((name) => (
                        <span
                          key={name}
                          className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-mono font-bold shadow ${getPointerColor(name)}`}
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Value label (on/above the bar) */}
                  <motion.div
                    key={`val-${stepIndex}-${index}-${value}`}
                    className="absolute left-1/2 -translate-x-1/2 text-xs sm:text-sm md:text-base font-bold text-foreground"
                    initial={false}
                    animate={{
                      bottom: Math.min(barAreaPx - 18, h + 8),
                      opacity: isSwapIndex ? 0 : dimBecauseSwapGhost ? 0.35 : 1,
                      scale: isStrongHighlight && !isSwapIndex ? 1.03 : 1,
                    }}
                    transition={{ type: 'spring', stiffness: 260, damping: 26 }}
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span className="rounded-md border border-border/60 bg-background/90 px-2 py-0.5 shadow-sm">
                      {value}
                    </span>
                  </motion.div>

                  {/* Bar anchored to baseline */}
                  <motion.div
                    className={`absolute bottom-0 left-0 right-0 rounded-md shadow-sm ${indicator.fill ?? 'bg-sky-300/80'} ${indicator.ring ?? ''}`}
                    style={{
                      opacity: indicator.dim ? 0.28 : isSwapIndex ? 0 : dimBecauseSwapGhost ? 0.35 : 1,
                    }}
                    initial={false}
                    animate={{
                      height: h,
                      y: !dimBecauseSwapGhost && isStrongHighlight && !isSwapIndex ? -3 : 0,
                      scaleX: state === 'compare' && !isSwapIndex ? [1, 1.02, 1] : 1,
                      boxShadow:
                        state === 'compare' && !isSwapIndex
                          ? [
                              `0 0 0px 0px ${glowColor}`,
                              `0 10px 22px 0px ${glowColor}`,
                              `0 0 0px 0px ${glowColor}`,
                            ]
                          : isStrongHighlight && !isSwapIndex
                            ? `0 10px 22px 0px ${glowColor}`
                            : '0 0 0px 0px transparent',
                    }}
                    transition={{
                      height: { duration: settleMs / 1000, ease },
                      y: { duration: 0.35, ease },
                      boxShadow: state === 'compare' ? { duration: 0.9, ease, repeat: Infinity } : { duration: 0.35, ease },
                      scaleX: state === 'compare' ? { duration: 0.9, ease, repeat: Infinity } : { duration: 0.35, ease },
                    }}
                  />
                  {indicator.overlay && (
                    <motion.div
                      className={`absolute bottom-0 left-0 right-0 rounded-md ${indicator.overlay}`}
                      style={{ height: h }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: isSwapIndex ? 0 : dimBecauseSwapGhost ? 0.25 : 1 }}
                      transition={{ duration: 0.35, ease }}
                    />
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Index labels row */}
          <div className="absolute inset-x-0" style={{ bottom: 10, overflowX: allowHorizontalScroll ? 'auto' : 'hidden' }}>
            <div
              className="flex px-1"
              style={{
                gap: 'clamp(4px, 0.9vw, 10px)',
                minWidth:
                  allowHorizontalScroll && array.length > 0
                    ? Math.max(0, array.length * (density === 'dense' ? 18 : 22))
                    : undefined,
              }}
            >
              {array.map((_, index) => (
                <div
                  key={`idx-${stepIndex}-${index}`}
                  className={`flex-1 ${
                    density === 'dense' ? 'min-w-[10px] sm:min-w-[12px] md:min-w-[14px]' : 'min-w-[14px] sm:min-w-[18px] md:min-w-[22px]'
                  } text-center text-[10px] sm:text-xs md:text-sm font-medium text-foreground/80`}
                >
                  {index}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showExplanation && (
        <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-primary truncate">{step.label}</p>
            <span className="text-[10px] font-mono text-muted-foreground">{stepIndex + 1}</span>
          </div>
          <p className="mt-2 text-sm text-foreground/90 leading-relaxed">{step.explanation}</p>
        </div>
      )}
    </div>
  );
};
