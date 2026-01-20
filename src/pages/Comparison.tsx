import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Columns2, Play, Pause, SkipBack, SkipForward, Trophy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  AlgorithmType,
  SORTING_ALGORITHMS,
  Step,
} from '@/lib/stepTypes';
import { ThemeToggle } from '@/components/ThemeToggle';
import { StepRow } from '@/components/StepRow';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

import { generateBubbleSortSteps } from '@/lib/algorithms/sorting/bubbleSortSteps';
import { generateSelectionSortSteps } from '@/lib/algorithms/sorting/selectionSortSteps';
import { generateInsertionSortSteps } from '@/lib/algorithms/sorting/insertionSortSteps';
import { generateMergeSortSteps } from '@/lib/algorithms/sorting/mergeSortSteps';
import { generateQuickSortSteps } from '@/lib/algorithms/sorting/quickSortSteps';
import { generateHeapSortSteps } from '@/lib/algorithms/sorting/heapSortSteps';

type CompareCategory = 'sorting';

type StepEventType = 'compare' | 'swap' | 'other';

const EPS_S = 0.005; // 5ms tie tolerance

const COMPARE_COST = 1;
const SWAP_COST = 3;

type RunnerState = {
  algorithm: AlgorithmType;
  steps: Step[];
  timeline: number[];
  cursor: number;
  isPlaying: boolean;
  generationMs: number;
  playbackStartMs: number | null;
  playbackEndMs: number | null;
  work: {
    comparisons: number;
    swaps: number;
    passes: number;
    totalSteps: number;
    estimated: number;
    pointerMoves: number;
    foundIndex: number | null;
  };
};

const DEFAULT_ARRAY = '23,1,10,5,2,7,15';

const LEGEND_SORTING = [
  { label: 'Compare', dotClass: 'bg-compare' },
  { label: 'Swap', dotClass: 'bg-swap' },
  { label: 'Key', dotClass: 'bg-key' },
  { label: 'Pivot', dotClass: 'bg-pivot' },
  { label: 'Sorted', dotClass: 'bg-sorted' },
];


const parseArrayInput = (input: string): number[] => {
  return input
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => Number.isFinite(n));
};

const hasAnyHighlight = (step: Step, key: keyof Step['highlights']['before']) => {
  return (step.highlights.before[key]?.length ?? 0) > 0 || (step.highlights.after[key]?.length ?? 0) > 0;
};

const getComparePair = (step: Step): { from: number; to: number } | null => {
  const arrow = step.moveArrows.find((a) => a.type === 'compare');
  if (arrow) {
    return arrow.fromIndex < arrow.toIndex
      ? { from: arrow.fromIndex, to: arrow.toIndex }
      : { from: arrow.toIndex, to: arrow.fromIndex };
  }

  const indices = (step.highlights.after.compare?.length ? step.highlights.after.compare : step.highlights.before.compare) ?? [];
  if (indices.length >= 2) {
    const a = indices[0];
    const b = indices[1];
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return a < b ? { from: a, to: b } : { from: b, to: a };
    }
  }
  return null;
};

const getSwapPair = (step: Step): { from: number; to: number } | null => {
  const arrow = step.moveArrows.find((a) => a.type === 'swap' || a.type === 'shift');
  if (!arrow) return null;
  const a = arrow.fromIndex;
  const b = arrow.toIndex;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return a < b ? { from: a, to: b } : { from: b, to: a };
};

const getEventType = (step: Step): StepEventType => {
  // IMPORTANT: only treat real data-movement arrows as swaps.
  // Some generators (e.g. search “not found” visual steps) may highlight `swap` incorrectly.
  const hasSwap = step.moveArrows.some((a) => a.type === 'swap' || a.type === 'shift');
  if (hasSwap) return 'swap';
  const hasCompare = step.moveArrows.some((a) => a.type === 'compare') || hasAnyHighlight(step, 'compare');
  if (hasCompare) return 'compare';
  return 'other';
};

// Timeline used for comparison playback: include meaningful algorithm events only.
// This avoids one algorithm being penalized for extra explanatory/display-only steps.
const buildComparisonTimeline = (steps: Step[]): number[] => {
  if (steps.length === 0) return [];

  const indices: number[] = [0];
  for (let i = 1; i < steps.length; i++) {
    const step = steps[i];
    const evt = getEventType(step);
    const includeForLearning =
      evt !== 'other' ||
      hasAnyHighlight(step, 'pivot') ||
      hasAnyHighlight(step, 'key') ||
      hasAnyHighlight(step, 'found') ||
      hasAnyHighlight(step, 'sorted') ||
      hasAnyHighlight(step, 'eliminated');

    if (includeForLearning) indices.push(i);
  }

  // Always include last step.
  const last = steps.length - 1;
  if (indices[indices.length - 1] !== last) indices.push(last);

  // De-dupe and keep order.
  const seen = new Set<number>();
  return indices.filter((x) => (seen.has(x) ? false : (seen.add(x), true)));
};

const computeWork = (steps: Step[], timeline: number[]) => {
  let comparisons = 0;
  let swaps = 0;
  let passes = 0;
  let pointerMoves = 0;
  let foundIndex: number | null = null;

  let prevPointers: Record<string, number | null> | null = null;

  for (const idx of timeline) {
    const s = steps[idx];
    const evt = getEventType(s);
    if (evt === 'compare') comparisons++;
    if (evt === 'swap') swaps++;
    passes = Math.max(passes, s.metrics?.passes ?? 0);

    // Pointer move = any pointer value change between included timeline steps.
    if (prevPointers) {
      const keys = new Set([...Object.keys(prevPointers), ...Object.keys(s.pointers ?? {})]);
      for (const key of keys) {
        const a = prevPointers[key] ?? null;
        const b = s.pointers?.[key] ?? null;
        if (a !== b) pointerMoves++;
      }
    }
    prevPointers = s.pointers ?? null;

    if (foundIndex == null) {
      const beforeFound = s.highlights?.before?.found ?? [];
      const afterFound = s.highlights?.after?.found ?? [];
      const candidate = afterFound[0] ?? beforeFound[0];
      if (Number.isFinite(candidate)) foundIndex = candidate;
    }
  }

  const totalSteps = timeline.length;
  const estimated = comparisons * COMPARE_COST + swaps * SWAP_COST;
  return { comparisons, swaps, passes, totalSteps, estimated, pointerMoves, foundIndex };
};

const durationSeconds = (state: RunnerState): number | null => {
  if (state.playbackStartMs == null || state.playbackEndMs == null) return null;
  const ms = state.playbackEndMs - state.playbackStartMs;
  if (!Number.isFinite(ms) || ms < 0) return null;
  return ms / 1000;
};

const formatRelativeSpeed = (speed: number | null, suffix?: string) => {
  if (speed == null || !Number.isFinite(speed) || speed <= 0) return '—';
  const base = Math.abs(speed - 1) < 1e-9 ? '1x' : `${speed.toFixed(2)}x`;
  return suffix ? `${base} ${suffix}` : base;
};

const formatSlowerRelativeSpeed = (speed: number) => {
  // Always show a slower algorithm as > 1.00x (otherwise it can visually contradict
  // the "Sorted first" label due to rounding when durations are long).
  if (!Number.isFinite(speed) || speed <= 0) return '—';
  if (speed <= 1) return '1.01x';
  const rounded = Number(speed.toFixed(2));
  return rounded <= 1 ? '1.01x' : `${rounded.toFixed(2)}x`;
};

const isOneX = (label: string) => label.trim().startsWith('1x');

const generateStepsForAlgorithm = (algorithm: AlgorithmType, arr: number[], targetRaw: string): Step[] => {
  switch (algorithm) {
    case 'bubble-sort':
      return generateBubbleSortSteps(arr);
    case 'selection-sort':
      return generateSelectionSortSteps(arr);
    case 'insertion-sort':
      return generateInsertionSortSteps(arr);
    case 'merge-sort':
      return generateMergeSortSteps(arr);
    case 'quick-sort':
      return generateQuickSortSteps(arr);
    case 'heap-sort':
      return generateHeapSortSteps(arr);
    default:
      return generateBubbleSortSteps(arr);
  }
};

const RunnerPanel: React.FC<{
  title: string;
  category: CompareCategory;
  state: RunnerState;
  algorithms: { id: AlgorithmType; name: string }[];
  onAlgorithmChange: (next: AlgorithmType) => void;
  onPlayPause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  sharedSpeedMs: number;
  relativeSpeedLabel: string;
  winnerWork?: boolean;
}> = ({
  title,
  category,
  state,
  algorithms,
  onAlgorithmChange,
  onPlayPause,
  onPrev,
  onNext,
  onReset,
  sharedSpeedMs,
  relativeSpeedLabel,
  winnerWork,
}) => {
  const currentRawIndex = state.timeline[state.cursor] ?? 0;
  const currentStep = state.steps[currentRawIndex];
  const isAtStart = state.cursor === 0;
  const isAtEnd = state.steps.length === 0 || state.cursor >= Math.max(0, state.timeline.length - 1);
  const currentPass = currentStep?.metrics.passes ?? 0;

  const speedLabel = sharedSpeedMs < 500 ? 'Fast' : sharedSpeedMs < 1000 ? 'Normal' : 'Slow';

  const stepNumber = state.steps.length > 0 ? state.cursor + 1 : 0;
  const legendItems = LEGEND_SORTING;

  const progressWork = useMemo(() => {
    let comparisons = 0;
    let swaps = 0;
    let pointerMoves = 0;
    let prevPointers: Record<string, number | null> | null = null;

    for (let i = 0; i <= state.cursor; i++) {
      const rawIdx = state.timeline[i];
      if (rawIdx == null) continue;
      const step = state.steps[rawIdx];
      const evt = getEventType(step);
      if (evt === 'compare') comparisons++;
      if (evt === 'swap') swaps++;

      if (prevPointers) {
        const keys = new Set([...Object.keys(prevPointers), ...Object.keys(step.pointers ?? {})]);
        for (const key of keys) {
          const a = prevPointers[key] ?? null;
          const b = step.pointers?.[key] ?? null;
          if (a !== b) pointerMoves++;
        }
      }
      prevPointers = step.pointers ?? null;
    }

    return { comparisons, swaps, pointerMoves };
  }, [state.cursor, state.steps, state.timeline]);

  const action = useMemo(() => {
    if (!currentStep) return null;

    const isSorted =
      hasAnyHighlight(currentStep, 'sorted') ||
      currentStep.label.toLowerCase().includes('sorted');

    if (isSorted) {
      return { kind: 'sorted' as const, label: 'Sorted', detail: 'Array is sorted' };
    }

    const evt = getEventType(currentStep);
    if (evt === 'swap') {
      const pair = getSwapPair(currentStep);
      const detail = pair ? `Swap ${pair.from} ↔ ${pair.to}` : 'Swap';
      return { kind: 'swap' as const, label: 'Swap', detail };
    }

    if (evt === 'compare') {
      const pair = getComparePair(currentStep);
      const detail = pair ? `Compare ${pair.from} vs ${pair.to}` : 'Compare';
      return { kind: 'compare' as const, label: 'Compare', detail };
    }

    return { kind: 'other' as const, label: 'Step', detail: 'Progress' };
  }, [currentStep]);

  return (
    <Card className="h-full flex flex-col overflow-hidden">
      <CardHeader className="py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold bg-primary text-primary-foreground">
                {stepNumber || '—'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-[10px] font-mono text-primary">{stepNumber ? `S${stepNumber}` : '—'}</span>
                  {winnerWork && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                      <Trophy className="h-3 w-3" /> Work Winner
                    </span>
                  )}
                  {action && (
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border ${
                        action.kind === 'swap'
                          ? 'bg-swap/10 text-swap border-swap/25'
                          : action.kind === 'compare'
                            ? 'bg-compare/10 text-compare border-compare/25'
                            : action.kind === 'sorted'
                              ? 'bg-sorted/10 text-sorted border-sorted/25'
                              : 'bg-muted/30 text-muted-foreground border-border'
                      }`}
                      title={action.detail}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          action.kind === 'swap'
                            ? 'bg-swap'
                            : action.kind === 'compare'
                              ? 'bg-compare'
                              : action.kind === 'sorted'
                                ? 'bg-sorted'
                                : 'bg-muted-foreground'
                        }`}
                      />
                      {action.label}
                    </span>
                  )}
                </div>
                <p className="text-[11px] md:text-xs font-medium truncate text-foreground">
                  {currentStep?.label ?? `${title}`}
                </p>
              </div>
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm md:text-base">{title}</CardTitle>
              <span className="text-xs font-normal text-muted-foreground">(sorting)</span>
            </div>
            <select
              value={state.algorithm}
              onChange={(e) => onAlgorithmChange(e.target.value as AlgorithmType)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm"
            >
              {algorithms.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={onPrev} disabled={isAtStart || state.steps.length === 0}>
            <SkipBack className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={onPlayPause} disabled={state.steps.length === 0 || (isAtEnd && !state.isPlaying)}>
            {state.isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button variant="secondary" size="sm" onClick={onNext} disabled={isAtEnd || state.steps.length === 0}>
            <SkipForward className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset} disabled={state.steps.length === 0}>
            Reset
          </Button>

          <div className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
            {state.steps.length > 0 ? (
              <>
                <span className="font-medium">{state.cursor + 1}/{state.timeline.length}</span>
                <span>•</span>
                <span>C {progressWork.comparisons}/{state.work.comparisons}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline font-medium">Pass {currentPass}</span>
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">S {progressWork.swaps}/{state.work.swaps}</span>
              </>
            ) : (
              <span>Generate steps</span>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <button className="ml-2 inline-flex items-center rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-background">
                  Legend
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-2">
                <div className="flex flex-wrap items-center gap-2">
                  {legendItems.map((it) => (
                    <span
                      key={it.label}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-background/60 px-2 py-0.5 text-[10px] text-muted-foreground"
                    >
                      <span className={`h-2 w-2 rounded-full ${it.dotClass}`} />
                      {it.label}
                    </span>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            <span className="ml-3 text-[11px] text-muted-foreground">Speed</span>
            <span className="text-[11px] font-semibold text-primary">{speedLabel}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 min-h-0 overflow-hidden">
        {currentStep ? (
          <div className="h-full overflow-hidden">
            <div className="h-full rounded-xl border border-border bg-background/60 p-2 md:p-3 flex flex-col">
              <div
                className={`rounded-lg ${
                  action?.kind === 'swap'
                    ? 'ring-1 ring-swap/25'
                    : action?.kind === 'compare'
                      ? 'ring-1 ring-compare/25'
                      : action?.kind === 'sorted'
                        ? 'ring-1 ring-sorted/25'
                        : 'ring-1 ring-border/30'
                }`}
              >
                <StepRow
                  step={currentStep}
                  prevStep={state.cursor > 0 ? state.steps[state.cursor - 1] : undefined}
                  stepNumber={state.cursor + 1}
                  isActive={true}
                  showArrows={true}
                  stableLayout={true}
                  indicatorMode="focus"
                  algorithm={state.algorithm}
                />
              </div>

              {/* Keep the array/step card fully in-view: explanation is compact and can truncate */}
              <div className="mt-2 rounded-lg bg-primary/5 border border-primary/20 p-3 min-h-0 overflow-hidden">
                <p className="text-sm md:text-base text-foreground leading-relaxed line-clamp-2 md:line-clamp-3">
                  {currentStep.explanation}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
            No steps yet
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const Comparison: React.FC = () => {
  const navigate = useNavigate();

  const category: CompareCategory = 'sorting';
  const algorithms = useMemo(() => SORTING_ALGORITHMS, []);

  const [arrayInput, setArrayInput] = useState(DEFAULT_ARRAY);

  const [sharedSpeedMs, setSharedSpeedMs] = useState(1200);

  const [left, setLeft] = useState<RunnerState>(() => ({
    algorithm: 'bubble-sort',
    steps: [],
    timeline: [],
    cursor: 0,
    isPlaying: false,
    generationMs: 0,
    playbackStartMs: null,
    playbackEndMs: null,
    work: { comparisons: 0, swaps: 0, passes: 0, totalSteps: 0, estimated: 0, pointerMoves: 0, foundIndex: null },
  }));

  const [right, setRight] = useState<RunnerState>(() => ({
    algorithm: 'selection-sort',
    steps: [],
    timeline: [],
    cursor: 0,
    isPlaying: false,
    generationMs: 0,
    playbackStartMs: null,
    playbackEndMs: null,
    work: { comparisons: 0, swaps: 0, passes: 0, totalSteps: 0, estimated: 0, pointerMoves: 0, foundIndex: null },
  }));



  const generateBoth = () => {
    const arr = parseArrayInput(arrayInput);
    if (arr.length === 0) return;

    const now = performance.now.bind(performance);

    const t1 = now();
    const leftSteps = generateStepsForAlgorithm(left.algorithm, arr, '');
    const t2 = now();

    const t3 = now();
    const rightSteps = generateStepsForAlgorithm(right.algorithm, arr, '');
    const t4 = now();

    const leftTimeline = buildComparisonTimeline(leftSteps);
    const rightTimeline = buildComparisonTimeline(rightSteps);

    setLeft((s) => ({
      ...s,
      steps: leftSteps,
      timeline: leftTimeline,
      cursor: 0,
      isPlaying: false,
      generationMs: t2 - t1,
      playbackStartMs: null,
      playbackEndMs: null,
      work: computeWork(leftSteps, leftTimeline),
    }));
    setRight((s) => ({
      ...s,
      steps: rightSteps,
      timeline: rightTimeline,
      cursor: 0,
      isPlaying: false,
      generationMs: t4 - t3,
      playbackStartMs: null,
      playbackEndMs: null,
      work: computeWork(rightSteps, rightTimeline),
    }));
  };

  const playBoth = () => {
    const start = left.playbackStartMs ?? right.playbackStartMs ?? performance.now();
    setLeft((s) => ({ ...s, isPlaying: s.steps.length > 0, playbackStartMs: start }));
    setRight((s) => ({ ...s, isPlaying: s.steps.length > 0, playbackStartMs: start }));
  };

  const pauseBoth = () => {
    setLeft((s) => ({ ...s, isPlaying: false }));
    setRight((s) => ({ ...s, isPlaying: false }));
  };

  const resetBoth = () => {
    setLeft((s) => ({ ...s, cursor: 0, isPlaying: false, playbackStartMs: null, playbackEndMs: null }));
    setRight((s) => ({ ...s, cursor: 0, isPlaying: false, playbackStartMs: null, playbackEndMs: null }));
  };

  // SINGLE SCHEDULER (prevents drift): one shared tick drives both sides.
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number>(0);
  const accRef = useRef<number>(0);

  useEffect(() => {
    const anyPlaying = left.isPlaying || right.isPlaying;
    if (!anyPlaying) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      accRef.current = 0;
      return;
    }

    const stepEveryMs = Math.max(sharedSpeedMs, 1200);
    lastTsRef.current = performance.now();

    const tick = (ts: number) => {
      const dt = ts - lastTsRef.current;
      lastTsRef.current = ts;
      accRef.current += dt;

      if (accRef.current >= stepEveryMs) {
        accRef.current = 0;

        const endTs = ts;

        setLeft((s) => {
          if (!s.isPlaying || s.steps.length === 0) return s;
          const atEnd = s.cursor >= Math.max(0, s.timeline.length - 1);
          if (atEnd) {
            const end = s.playbackEndMs ?? endTs;
            return { ...s, isPlaying: false, playbackEndMs: end };
          }
          return { ...s, cursor: s.cursor + 1 };
        });

        setRight((s) => {
          if (!s.isPlaying || s.steps.length === 0) return s;
          const atEnd = s.cursor >= Math.max(0, s.timeline.length - 1);
          if (atEnd) {
            const end = s.playbackEndMs ?? endTs;
            return { ...s, isPlaying: false, playbackEndMs: end };
          }
          return { ...s, cursor: s.cursor + 1 };
        });
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [left.isPlaying, right.isPlaying, sharedSpeedMs]);

  const workWinner = useMemo(() => {
    if (left.steps.length === 0 || right.steps.length === 0) return '—' as const;
    if (left.work.estimated < right.work.estimated) return 'A' as const;
    if (right.work.estimated < left.work.estimated) return 'B' as const;
    return 'Tie' as const;
  }, [left.steps.length, left.work.estimated, right.steps.length, right.work.estimated]);

  const playbackSummary = useMemo(() => {
    const tA = durationSeconds(left);
    const tB = durationSeconds(right);
    if (tA == null || tB == null) {
      return {
        sortedFirst: '—' as const,
        relativeA: '—',
        relativeB: '—',
        isTie: false,
      };
    }

    const isTie = Math.abs(tA - tB) <= EPS_S;
    if (isTie) {
      return {
        sortedFirst: 'Tie' as const,
        relativeA: formatRelativeSpeed(1, '(Tie)'),
        relativeB: formatRelativeSpeed(1, '(Tie)'),
        isTie: true,
      };
    }

    // Strict rule: fastest -> Sorted First, slower -> Sorted Later. Never infer this from render order.
    if (tA < tB) {
      return {
        sortedFirst: 'A' as const,
        relativeA: '1x',
        relativeB: formatSlowerRelativeSpeed(tB / tA),
        isTie: false,
      };
    }

    return {
      sortedFirst: 'B' as const,
      relativeA: formatSlowerRelativeSpeed(tA / tB),
      relativeB: '1x',
      isTie: false,
    };
  }, [left.playbackEndMs, left.playbackStartMs, right.playbackEndMs, right.playbackStartMs]);

  const getAlgorithmName = (id: AlgorithmType) => algorithms.find((a) => a.id === id)?.name ?? id;

  const sortedFirstLabel = (() => {
    // CRITICAL RULE: decide strictly from computed playback speed result (duration-based)
    // and tie tolerance; never infer from render/state order, steps, or work.
    if (playbackSummary.sortedFirst === 'A') return getAlgorithmName(left.algorithm);
    if (playbackSummary.sortedFirst === 'B') return getAlgorithmName(right.algorithm);
    if (playbackSummary.sortedFirst === 'Tie') return 'Tie';
    return '—';
  })();

  const workWinnerLabel =
    workWinner === 'A' ? getAlgorithmName(left.algorithm) : workWinner === 'B' ? getAlgorithmName(right.algorithm) : workWinner;

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-md z-50">
        <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between gap-2">
          <motion.div className="flex items-center gap-2 md:gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <button
              onClick={() => navigate('/')}
              className="p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg"
              aria-label="Back to visualizer"
            >
              <Bug className="w-4 h-4 md:w-6 md:h-6 text-primary-foreground" />
            </button>
            <div className="hidden sm:block">
              <h1 className="font-bold text-base md:text-xl text-foreground">Comparison</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground">Side-by-side algorithm performance</p>
            </div>
          </motion.div>

          <motion.nav className="flex items-center gap-1 md:gap-2 bg-secondary/50 p-1 md:p-1.5 rounded-xl" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button
              onClick={() => navigate('/')}
              className="nav-tab nav-tab-inactive"
              title="Back"
            >
              <Bug className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Visualizer</span>
            </button>
            <div className="nav-tab nav-tab-active">
              <span className="hidden sm:inline">Sorting Only</span>
            </div>
            <div className="nav-tab nav-tab-active">
              <Columns2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Comparison</span>
            </div>
          </motion.nav>

          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-2 md:p-4 min-h-0 overflow-hidden flex flex-col gap-3">
        {/* Compact result chips (no bulky bar) */}
        <div className="shrink-0 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            Relative Speed:{' '}
            <span className="font-semibold text-foreground whitespace-normal break-words">
              {getAlgorithmName(left.algorithm)} {playbackSummary.relativeA} • {getAlgorithmName(right.algorithm)} {playbackSummary.relativeB}
            </span>
          </span>
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            Sorted first: <span className="font-semibold text-foreground">{sortedFirstLabel}</span>
          </span>
          <span className="rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            Work Winner: <span className="font-semibold text-foreground">{workWinnerLabel}</span>
          </span>
        </div>

        {/* Always-visible dashboard controls (no drawer/menu) */}
        <div className="shrink-0 rounded-xl border border-border bg-card/60 px-3 py-2">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="flex-1 flex flex-col sm:flex-row sm:items-end gap-2">
              <div className="flex-1">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-wider">Array</Label>
                <Input
                  value={arrayInput}
                  onChange={(e) => setArrayInput(e.target.value)}
                  placeholder="e.g., 23,1,10,5,2"
                  className="mt-1 h-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 justify-between lg:justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <Button size="sm" onClick={generateBoth}>Generate</Button>
                <Button size="sm" variant="secondary" onClick={playBoth} disabled={left.steps.length === 0 || right.steps.length === 0}>
                  Play both
                </Button>
                <Button size="sm" variant="secondary" onClick={pauseBoth} disabled={!left.isPlaying && !right.isPlaying}>
                  Pause
                </Button>
                <Button size="sm" variant="ghost" onClick={resetBoth} disabled={left.steps.length === 0 && right.steps.length === 0}>
                  Reset
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-2">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Shared speed</span>
              <span className="font-semibold text-primary">{sharedSpeedMs < 500 ? 'Fast' : sharedSpeedMs < 1000 ? 'Normal' : 'Slow'}</span>
            </div>
            <Slider
              value={[2000 - sharedSpeedMs]}
              onValueChange={([v]) => setSharedSpeedMs(2000 - v)}
              min={0}
              max={1800}
              step={100}
              className="py-1"
            />
          </div>
        </div>

        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2 grid-rows-2 lg:grid-rows-1 gap-3 md:gap-4">
          <RunnerPanel
            title="Algorithm A"
            category={category}
            state={left}
            algorithms={algorithms}
            onAlgorithmChange={(next) =>
              setLeft((s) => ({
                ...s,
                algorithm: next,
                steps: [],
                timeline: [],
                cursor: 0,
                isPlaying: false,
                generationMs: 0,
                playbackStartMs: null,
                playbackEndMs: null,
                work: { comparisons: 0, swaps: 0, passes: 0, totalSteps: 0, estimated: 0, pointerMoves: 0, foundIndex: null },
              }))
            }
            onPlayPause={() => ((left.isPlaying || right.isPlaying) ? pauseBoth() : playBoth())}
            onPrev={() => setLeft((s) => ({ ...s, cursor: Math.max(0, s.cursor - 1) }))}
            onNext={() =>
              setLeft((s) => ({
                ...s,
                cursor: Math.min(Math.max(0, s.timeline.length - 1), s.cursor + 1),
              }))
            }
            onReset={() => setLeft((s) => ({ ...s, cursor: 0, isPlaying: false, playbackStartMs: null, playbackEndMs: null }))}
            sharedSpeedMs={sharedSpeedMs}
            relativeSpeedLabel={playbackSummary.relativeA}
            winnerWork={workWinner === 'A'}
          />

          <RunnerPanel
            title="Algorithm B"
            category={category}
            state={right}
            algorithms={algorithms}
            onAlgorithmChange={(next) =>
              setRight((s) => ({
                ...s,
                algorithm: next,
                steps: [],
                timeline: [],
                cursor: 0,
                isPlaying: false,
                generationMs: 0,
                playbackStartMs: null,
                playbackEndMs: null,
                work: { comparisons: 0, swaps: 0, passes: 0, totalSteps: 0, estimated: 0, pointerMoves: 0, foundIndex: null },
              }))
            }
            onPlayPause={() => ((left.isPlaying || right.isPlaying) ? pauseBoth() : playBoth())}
            onPrev={() => setRight((s) => ({ ...s, cursor: Math.max(0, s.cursor - 1) }))}
            onNext={() =>
              setRight((s) => ({
                ...s,
                cursor: Math.min(Math.max(0, s.timeline.length - 1), s.cursor + 1),
              }))
            }
            onReset={() => setRight((s) => ({ ...s, cursor: 0, isPlaying: false, playbackStartMs: null, playbackEndMs: null }))}
            sharedSpeedMs={sharedSpeedMs}
            relativeSpeedLabel={playbackSummary.relativeB}
            winnerWork={workWinner === 'B'}
          />
        </div>
      </main>
    </div>
  );
};

export default Comparison;
