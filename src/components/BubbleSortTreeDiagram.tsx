import * as React from 'react';
import { Maximize2, Minus, Plus, RefreshCcw } from 'lucide-react';

import { BubbleSortTreeViewer, type BubbleSortTreeViewerApi } from '@/components/BubbleSortTreeViewer';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { Metrics, Step } from '@/lib/stepTypes';
import { cn } from '@/lib/utils';

type Props = {
  steps: Step[];
  autoOpenFullscreen?: boolean;
  onAutoOpenConsumed?: () => void;
};

type BubbleEventKind = 'initial' | 'compare' | 'swap' | 'passDone' | 'final' | 'other';

type BubbleEvent = {
  id: string;
  stepIndex: number;
  kind: BubbleEventKind;
  pass: number;
  label: string;
  explanation: string;
  metrics: Metrics;
  before: number[];
  after: number[];
  compareJ: number | null;
  swapJ: number | null;
  sortedIndices: number[];
};

type PassSummary = {
  pass: number;
  eventIndex: number;
  fixedIndex: number | null;
  fixedValue: number | null;
  metrics: Metrics;
};

const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));

const swapInPlace = <T,>(arr: T[], i: number) => {
  const a = arr[i];
  const b = arr[i + 1];
  if (a === undefined || b === undefined) return;
  arr[i] = b;
  arr[i + 1] = a;
};

const parsePass = (s: Step) => {
  const fromMetrics = s.metrics?.passes;
  if (typeof fromMetrics === 'number' && Number.isFinite(fromMetrics)) return fromMetrics;
  const m = /pass\s+(\d+)/i.exec(s.label);
  if (!m) return 0;
  const v = Number(m[1]);
  return Number.isFinite(v) ? v : 0;
};

const toEvent = (s: Step, stepIndex: number): BubbleEvent => {
  const compare = Array.isArray(s.highlights?.after?.compare) ? s.highlights.after.compare : [];
  const swap = Array.isArray(s.highlights?.after?.swap) ? s.highlights.after.swap : [];
  const sorted = Array.isArray(s.highlights?.after?.sorted) ? s.highlights.after.sorted : [];

  const pass = parsePass(s);
  const compareJ = compare.length >= 2 ? (compare[0] ?? null) : null;
  const swapJ = swap.length >= 2 ? (swap[0] ?? null) : null;

  const kind: BubbleEventKind =
    s.label === 'Initial Array'
      ? 'initial'
      : s.label === 'Sorted!'
        ? 'final'
        : swapJ != null
          ? 'swap'
          : compareJ != null
            ? 'compare'
            : /element\s+sorted/i.test(s.label)
              ? 'passDone'
              : 'other';

  return {
    id: `${stepIndex}-${s.label}`,
    stepIndex,
    kind,
    pass,
    label: s.label,
    explanation: s.explanation,
    metrics: s.metrics,
    before: s.before,
    after: s.after,
    compareJ,
    swapJ,
    sortedIndices: sorted,
  };
};

const buildEvents = (steps: Step[]) => steps.map((s, i) => toEvent(s, i));

const buildPassSummaries = (events: BubbleEvent[], n: number): PassSummary[] => {
  const out: PassSummary[] = [];
  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (!e) continue;
    if (e.kind !== 'passDone') continue;
    const pass = e.pass;
    const fixedIndex = n > 0 && pass > 0 ? n - pass : null;
    const fixedValue = fixedIndex != null && fixedIndex >= 0 && fixedIndex < e.after.length ? (e.after[fixedIndex] ?? null) : null;
    out.push({ pass, eventIndex: i, fixedIndex, fixedValue, metrics: e.metrics });
  }
  return out;
};

const PALETTE = {
  bg0: '#070B12',
  bg1: '#0B1220',
  blue: '#2563EB',
  blueEdge: '#93C5FD',
  amber: '#F59E0B',
  amberEdge: '#FDE68A',
  orange: '#F97316',
  orangeEdge: '#FDBA74',
  green: '#22C55E',
  greenEdge: '#86EFAC',
  ink: 'rgba(248,250,252,0.98)',
  inkDim: 'rgba(226,232,240,0.78)',
  panel: '#0F172A',
};

function computeTokenOrder(events: BubbleEvent[], cursor: number, n: number) {
  const order = Array.from({ length: n }, (_, i) => i);
  const upto = clamp(cursor, 0, Math.max(0, events.length - 1));
  for (let i = 0; i <= upto; i++) {
    const e = events[i];
    if (!e) continue;
    if (e.kind === 'swap' && e.swapJ != null && Number.isFinite(e.swapJ)) {
      const j = e.swapJ;
      if (j >= 0 && j + 1 < order.length) swapInPlace(order, j);
    }
  }
  return order;
}

type StageRenderProps = {
  svgRef?: React.Ref<SVGSVGElement>;
  event: BubbleEvent | null;
  tokenOrder: number[];
  tokenValuesById: number[];
  stageW: number;
  stageH: number;
  cellW: number;
  cellH: number;
  gap: number;
  padX: number;
  padY: number;
  transitionMs: number;
};

function StageSvg({
  svgRef,
  event,
  tokenOrder,
  tokenValuesById,
  stageW,
  stageH,
  cellW,
  cellH,
  gap,
  padX,
  padY,
  transitionMs,
}: StageRenderProps) {
  const n = tokenOrder.length;
  const j = event?.compareJ ?? event?.swapJ ?? null;
  const isSwap = event?.kind === 'swap';

  const sorted = new Set<number>(event?.sortedIndices ?? []);
  const hot = new Set<number>();
  if (j != null && j >= 0 && j + 1 < n) {
    hot.add(j);
    hot.add(j + 1);
  }

  const xAt = (idx: number) => Math.round(padX + idx * (cellW + gap));
  const baseY = Math.round(padY + 46);
  const arcY = Math.round(baseY + cellH + 26);

  const arc = (() => {
    if (j == null) return null;
    const x1 = xAt(j) + cellW / 2;
    const x2 = xAt(j + 1) + cellW / 2;
    const y0 = arcY;
    const y1 = arcY + 16;
    return {
      d: `M ${x1} ${y0} C ${x1} ${y1}, ${x2} ${y1}, ${x2} ${y0}`,
      stroke: isSwap ? PALETTE.orangeEdge : PALETTE.amberEdge,
    };
  })();

  const dur = isSwap ? '0.7s' : '0.95s';

  return (
    <svg
      ref={svgRef}
      className="block"
      width={stageW}
      height={stageH}
      viewBox={`0 0 ${stageW} ${stageH}`}
      shapeRendering="geometricPrecision"
      textRendering="geometricPrecision"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <defs>
        <linearGradient id="bubbleStageBg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={PALETTE.bg0} />
          <stop offset="100%" stopColor={PALETTE.bg1} />
        </linearGradient>
      </defs>

      <rect x={0} y={0} width={stageW} height={stageH} fill="url(#bubbleStageBg)" />

      <text
        x={padX}
        y={padY + 22}
        fontSize={14}
        fontWeight={800}
        fill={PALETTE.ink}
        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
      >
        {event?.label ?? 'Bubble Sort'}
      </text>
      <text
        x={padX}
        y={padY + 40}
        fontSize={12}
        fontWeight={600}
        fill={PALETTE.inkDim}
        style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
      >
        {event?.explanation ?? ''}
      </text>

      {arc ? (
        <g>
          <path d={arc.d} fill="none" stroke={arc.stroke} strokeWidth={3} vectorEffect="non-scaling-stroke" />
          <circle r={5.5} fill={isSwap ? PALETTE.orange : PALETTE.amber}>
            <animateMotion dur={dur} repeatCount="indefinite" path={arc.d} />
          </circle>
        </g>
      ) : null}

      <g>
        {tokenOrder.map((tokenId, idx) => {
          const value = tokenValuesById[tokenId];
          const x = xAt(idx);
          const y = baseY;

          const isSorted = sorted.has(idx);
          const isHot = hot.has(idx);

          const fill = isSorted
            ? PALETTE.green
            : isHot
              ? isSwap
                ? PALETTE.orange
                : PALETTE.amber
              : PALETTE.blue;
          const stroke = isSorted
            ? PALETTE.greenEdge
            : isHot
              ? isSwap
                ? PALETTE.orangeEdge
                : PALETTE.amberEdge
              : PALETTE.blueEdge;

          const strokeWidth = isSorted ? 3.1 : isHot ? 3.0 : 2.85;

          return (
            <g
              key={tokenId}
              transform={`translate(${x}, ${y})`}
              style={{ transition: `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1)` }}
            >
              <rect
                x={0}
                y={0}
                width={cellW}
                height={cellH}
                rx={14}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={cellW / 2}
                y={cellH / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={20}
                fontWeight={900}
                fill={PALETTE.ink}
                style={{ fontFamily: 'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial' }}
              >
                {value}
              </text>

              {isSorted ? (
                <g transform={`translate(${cellW - 14}, 14)`}>
                  <circle r={11} fill={PALETTE.panel} stroke={PALETTE.greenEdge} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
                  <path
                    d="M -5 0 L -2 3 L 6 -5"
                    fill="none"
                    stroke={PALETTE.greenEdge}
                    strokeWidth={2.6}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </g>
              ) : null}
            </g>
          );
        })}
      </g>
    </svg>
  );
}

export const BubbleSortTreeDiagram: React.FC<Props> = ({ steps, autoOpenFullscreen, onAutoOpenConsumed }) => {
  const events = React.useMemo(() => buildEvents(steps), [steps]);

  const n = React.useMemo(() => {
    const first = steps[0];
    return first?.before?.length ?? first?.after?.length ?? 0;
  }, [steps]);

  const tokenValuesById = React.useMemo(() => {
    const first = steps[0];
    return first?.before?.length ? first.before : first?.after ?? [];
  }, [steps]);

  const passSummaries = React.useMemo(() => buildPassSummaries(events, n), [events, n]);

  const [mode, setMode] = React.useState<'animated' | 'static'>('animated');
  const [cursor, setCursor] = React.useState(0);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [speedMs, setSpeedMs] = React.useState(650);
  const [autoplay, setAutoplay] = React.useState(false);
  const [zoom, setZoom] = React.useState(1);

  const [selectedPass, setSelectedPass] = React.useState<number>(() => passSummaries.at(-1)?.pass ?? 1);
  const [isRecording, setIsRecording] = React.useState(false);
  const [includeNarrationOverlay, setIncludeNarrationOverlay] = React.useState(false);

  const [isFull, setIsFull] = React.useState(false);
  const fullApiRef = React.useRef<BubbleSortTreeViewerApi | null>(null);
  const inlineSvgRef = React.useRef<SVGSVGElement | null>(null);

  React.useEffect(() => {
    setCursor(0);
    setIsPlaying(false);
  }, [steps]);

  React.useEffect(() => {
    const p = passSummaries.at(-1)?.pass;
    if (p != null) setSelectedPass(p);
  }, [passSummaries]);

  React.useEffect(() => {
    if (!autoOpenFullscreen) return;
    setIsFull(true);
    onAutoOpenConsumed?.();
  }, [autoOpenFullscreen, onAutoOpenConsumed]);

  React.useEffect(() => {
    if (mode !== 'animated') return;
    if (!isPlaying) return;
    if (events.length <= 0) return;
    if (cursor >= events.length - 1) {
      setIsPlaying(false);
      return;
    }
    const id = window.setTimeout(() => setCursor((c) => Math.min(events.length - 1, c + 1)), speedMs);
    return () => window.clearTimeout(id);
  }, [cursor, events.length, isPlaying, mode, speedMs]);

  React.useEffect(() => {
    if (mode !== 'animated') return;
    if (!autoplay) return;
    if (isPlaying) return;
    if (cursor >= events.length - 1) return;
    setIsPlaying(true);
  }, [autoplay, cursor, events.length, isPlaying, mode]);

  const activeEventIndex = React.useMemo(() => {
    if (mode === 'animated') return clamp(cursor, 0, Math.max(0, events.length - 1));
    const chosen = passSummaries.find((p) => p.pass === selectedPass);
    if (chosen) return chosen.eventIndex;
    return passSummaries.at(-1)?.eventIndex ?? clamp(cursor, 0, Math.max(0, events.length - 1));
  }, [cursor, events.length, mode, passSummaries, selectedPass]);

  const event = events[activeEventIndex] ?? null;

  const tokenOrder = React.useMemo(() => computeTokenOrder(events, activeEventIndex, n), [activeEventIndex, events, n]);

  const stage = React.useMemo(() => {
    const cellW = 70;
    const cellH = 58;
    const gap = 14;
    const padX = 22;
    const padY = 18;
    const stageW = Math.max(360, Math.round(padX * 2 + n * cellW + Math.max(0, n - 1) * gap));
    const stageH = 210;
    return { cellW, cellH, gap, padX, padY, stageW, stageH };
  }, [n]);

  const bounds = React.useMemo(
    () => ({ minX: 0, minY: 0, maxX: stage.stageW, maxY: stage.stageH }),
    [stage.stageH, stage.stageW],
  );

  const transitionMs = React.useMemo(() => Math.max(220, Math.round(speedMs * 0.65)), [speedMs]);

  const reset = () => {
    setIsPlaying(false);
    setCursor(0);
  };

  const prev = () => {
    setIsPlaying(false);
    setCursor((c) => Math.max(0, c - 1));
  };

  const next = () => {
    setIsPlaying(false);
    setCursor((c) => Math.min(Math.max(0, events.length - 1), c + 1));
  };

  const getCurrentSvg = () => {
    if (isFull) return fullApiRef.current?.getSvgElement() ?? null;
    return inlineSvgRef.current;
  };

  const exportSvg = async () => {
    const svg = getCurrentSvg();
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('viewBox', `0 0 ${stage.stageW} ${stage.stageH}`);
    clone.setAttribute('width', `${stage.stageW}`);
    clone.setAttribute('height', `${stage.stageH}`);

    const serialized = new XMLSerializer().serializeToString(clone);
    const svgString = `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bubble-sort-step-player.svg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportPng = async () => {
    const svg = getCurrentSvg();
    if (!svg) return;

    const clone = svg.cloneNode(true) as SVGSVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
    clone.setAttribute('viewBox', `0 0 ${stage.stageW} ${stage.stageH}`);
    clone.setAttribute('width', `${stage.stageW}`);
    clone.setAttribute('height', `${stage.stageH}`);

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
    canvas.width = Math.ceil(stage.stageW * scale);
    canvas.height = Math.ceil(stage.stageH * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      URL.revokeObjectURL(url);
      return;
    }

    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) (ctx as any).imageSmoothingQuality = 'high';
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = PALETTE.bg0;
    ctx.fillRect(0, 0, stage.stageW, stage.stageH);
    ctx.drawImage(img, 0, 0, stage.stageW, stage.stageH);

    URL.revokeObjectURL(url);

    const pngBlob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!pngBlob) return;
    const pngUrl = URL.createObjectURL(pngBlob);
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = 'bubble-sort-step-player.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(pngUrl);
  };

  const recordAbortRef = React.useRef(false);
  const recorderRef = React.useRef<MediaRecorder | null>(null);
  const recordChunksRef = React.useRef<Blob[]>([]);

  const record = async () => {
    if (isRecording) {
      recordAbortRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
      return;
    }

    if (events.length <= 0) return;
    if (mode !== 'animated') setMode('animated');
    setIsPlaying(false);

    const snapCursor = cursor;
    setCursor(0);

    recordAbortRef.current = false;
    recordChunksRef.current = [];
    setIsRecording(true);

    const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));
    const sleep = (ms: number) => new Promise<void>((r) => window.setTimeout(() => r(), ms));

    const canvas = document.createElement('canvas');
    const renderScale = 2;
    canvas.width = Math.ceil(stage.stageW * renderScale);
    canvas.height = Math.ceil(stage.stageH * renderScale);
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
      a.download = 'bubble-sort-step-player.webm';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      recorderRef.current = null;
      recordChunksRef.current = [];
      setIsRecording(false);
      setCursor(snapCursor);
    };

    rec.start();

    for (let i = 0; i < events.length; i++) {
      if (recordAbortRef.current) break;
      setCursor(i);
      await nextFrame();
      await nextFrame();

      const svgEl = inlineSvgRef.current;
      if (!svgEl) break;

      const clone = svgEl.cloneNode(true) as SVGSVGElement;
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      clone.setAttribute('viewBox', `0 0 ${stage.stageW} ${stage.stageH}`);
      clone.setAttribute('width', `${stage.stageW}`);
      clone.setAttribute('height', `${stage.stageH}`);

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

      ctx.clearRect(0, 0, stage.stageW, stage.stageH);
      ctx.fillStyle = PALETTE.bg0;
      ctx.fillRect(0, 0, stage.stageW, stage.stageH);
      ctx.drawImage(img, 0, 0, stage.stageW, stage.stageH);
      URL.revokeObjectURL(url);

      if (includeNarrationOverlay) {
        const pad = 14;
        const h = 46;
        const message = events[i]?.explanation ?? '';
        ctx.save();
        ctx.globalAlpha = 0.92;
        ctx.fillStyle = PALETTE.panel;
        ctx.fillRect(pad, stage.stageH - h - pad, stage.stageW - pad * 2, h);
        ctx.globalAlpha = 1;
        ctx.strokeStyle = 'rgba(255,255,255,0.14)';
        ctx.lineWidth = 1;
        ctx.strokeRect(pad, stage.stageH - h - pad, stage.stageW - pad * 2, h);
        ctx.fillStyle = 'rgba(226,232,240,0.96)';
        ctx.font = '700 14px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
        ctx.textBaseline = 'middle';
        ctx.fillText(message.slice(0, 160), pad + 12, stage.stageH - h / 2 - pad, stage.stageW - pad * 2 - 24);
        ctx.restore();
      }

      await sleep(Math.max(160, Math.round(speedMs * 0.9)));
    }

    try {
      rec.stop();
    } catch {
      // ignore
    }
  };

  const Toggle = (
    <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
      <button
        type="button"
        onClick={() => {
          setMode('static');
          setIsPlaying(false);
        }}
        className={cn('h-8 rounded-lg px-3 text-xs font-semibold', mode === 'static' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}
      >
        Static
      </button>
      <button
        type="button"
        onClick={() => {
          setMode('animated');
        }}
        className={cn('h-8 rounded-lg px-3 text-xs font-semibold', mode === 'animated' ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-muted')}
      >
        Animated
      </button>
    </div>
  );

  const Stage = (
    <div className="diagram-no-blur rounded-2xl border border-border bg-card p-3">
      <div className="relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-b from-[#070B12] to-[#0B1220]">
        <div className="flex items-center justify-center" style={{ height: 'clamp(210px, 38vh, 300px)' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}>
            <StageSvg
              svgRef={inlineSvgRef}
              event={event}
              tokenOrder={tokenOrder}
              tokenValuesById={tokenValuesById}
              stageW={stage.stageW}
              stageH={stage.stageH}
              cellW={stage.cellW}
              cellH={stage.cellH}
              gap={stage.gap}
              padX={stage.padX}
              padY={stage.padY}
              transitionMs={transitionMs}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card px-4 py-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">Bubble Sort Step Player</div>
              <div className="text-[11px] text-muted-foreground">Animated: one step at a time • Static: pass summaries</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {Toggle}

              <div className="flex items-center gap-1 rounded-xl border border-border bg-card p-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => clamp(Math.round((z - 0.25) * 100) / 100, 0.75, 3))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <div className="min-w-[54px] text-center text-xs font-semibold tabular-nums text-foreground">{Math.round(zoom * 100)}%</div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setZoom((z) => clamp(Math.round((z + 0.25) * 100) / 100, 0.75, 3))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setZoom(1)} aria-label="Reset zoom">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
              </div>

              <Button variant="secondary" size="sm" onClick={exportSvg} disabled={isRecording || n <= 0}>
                Export SVG
              </Button>
              <Button variant="secondary" size="sm" onClick={exportPng} disabled={isRecording || n <= 0}>
                Export PNG
              </Button>
              <Button variant={isRecording ? 'secondary' : 'default'} size="sm" onClick={record} disabled={n <= 0}>
                {isRecording ? 'Stop' : 'Record'}
              </Button>

              <Button variant="outline" size="sm" onClick={() => setIsFull(true)} className="gap-2" disabled={n <= 0}>
                <Maximize2 className="h-4 w-4" />
                Fullscreen
              </Button>
            </div>
          </div>
        </div>

        {Stage}

        {mode === 'animated' ? (
          <div className="diagram-no-blur rounded-2xl border border-border bg-card px-4 py-3">
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={reset} disabled={isRecording || events.length <= 0}>
                    Restart
                  </Button>
                  <Button variant="secondary" size="sm" onClick={prev} disabled={isRecording || cursor <= 0}>
                    Prev
                  </Button>
                  <Button
                    variant={isPlaying ? 'secondary' : 'default'}
                    size="sm"
                    onClick={() => setIsPlaying((v) => !v)}
                    disabled={isRecording || events.length <= 0}
                  >
                    {isPlaying ? 'Pause' : 'Play'}
                  </Button>
                  <Button variant="secondary" size="sm" onClick={next} disabled={isRecording || cursor >= events.length - 1}>
                    Next
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-muted-foreground">Autoplay</div>
                    <Switch checked={autoplay} onCheckedChange={(v) => setAutoplay(!!v)} disabled={isRecording} />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-[11px] text-muted-foreground">Narration</div>
                    <Switch checked={includeNarrationOverlay} onCheckedChange={(v) => setIncludeNarrationOverlay(!!v)} disabled={isRecording} />
                  </div>
                  <div className="text-[11px] tabular-nums text-muted-foreground">
                    Step {Math.min(cursor + 1, Math.max(1, events.length))} / {Math.max(1, events.length)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-[11px] text-muted-foreground w-16">Speed</div>
                <Slider
                  value={[speedMs]}
                  min={250}
                  max={1200}
                  step={50}
                  onValueChange={(v) => setSpeedMs(v[0] ?? 650)}
                  className="flex-1"
                  disabled={isRecording}
                />
                <div className="text-[11px] tabular-nums text-muted-foreground w-16 text-right">{speedMs}ms</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="diagram-no-blur rounded-2xl border border-border bg-card px-4 py-3">
            <div className="text-sm font-semibold text-foreground">Pass summaries</div>
            <div className="text-[11px] text-muted-foreground">Select a pass to update the stage (no background step stacking).</div>

            <div className="mt-3">
              <Accordion type="single" collapsible className="w-full">
                {passSummaries.map((p) => (
                  <AccordionItem key={p.pass} value={`pass-${p.pass}`}>
                    <AccordionTrigger onClick={() => setSelectedPass(p.pass)} className={cn(selectedPass === p.pass && 'text-primary')}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold">Pass {p.pass}</span>
                        {p.fixedIndex != null ? (
                          <span className="text-[11px] text-muted-foreground">Fixed index {p.fixedIndex + 1} (value {p.fixedValue ?? '—'})</span>
                        ) : null}
                        <span className="text-[11px] text-muted-foreground">
                          {p.metrics.comparisons} comps • {p.metrics.swaps} swaps
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="text-[12px] text-muted-foreground">Click the header to show this pass result on the stage.</div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        )}

        <BubbleSortTreeViewer
          open={isFull}
          onOpenChange={setIsFull}
          title="Bubble Sort Step Player"
          subtitle="Pan/zoom in fullscreen • No blur/backdrop-filter"
          bounds={bounds}
          fitPadding={56}
          apiRef={fullApiRef}
          interactionDisabled={isRecording}
        >
          <StageSvg
            event={event}
            tokenOrder={tokenOrder}
            tokenValuesById={tokenValuesById}
            stageW={stage.stageW}
            stageH={stage.stageH}
            cellW={stage.cellW}
            cellH={stage.cellH}
            gap={stage.gap}
            padX={stage.padX}
            padY={stage.padY}
            transitionMs={transitionMs}
          />
        </BubbleSortTreeViewer>
      </div>
    </div>
  );
};
