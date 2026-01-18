import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

export const LOADER_TIMING = {
  // 2026-style cinematic but still bounded.
  // Keep maxVisibleMs as the hard cap.
  minVisibleMs: 1500,
  maxVisibleMs: 3000,
  formMs: 520,
  waveMs: 760,
  sweepMs: 760,
  swapMs: 360,
  fadeOutMs: 240,
} as const;

type InstantAlgoPulsePreloaderProps = {
  show: boolean;
  appReady?: boolean;
  brand?: string;
  subtitle?: string;
  subtext?: string;
  timing?: Partial<typeof LOADER_TIMING>;
  onFinished?: () => void;
};

type Item = { id: string; value: number; h: number };

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const InstantAlgoPulsePreloader: React.FC<InstantAlgoPulsePreloaderProps> = ({
  show,
  appReady = true,
  brand = "DSA Visualizer",
  subtitle = "Visual Algorithm Learning",
  subtext,
  timing,
  onFinished,
}) => {
  const reducedMotion = useReducedMotion();
  const t = useMemo(() => ({ ...LOADER_TIMING, ...(timing ?? {}) }), [timing]);

  const items = useMemo<Item[]>(
    () => [
      { id: "a", value: 7, h: 46 },
      { id: "b", value: 3, h: 26 },
      { id: "c", value: 8, h: 52 },
      { id: "d", value: 2, h: 22 },
      { id: "e", value: 6, h: 40 },
      { id: "f", value: 4, h: 30 },
      { id: "g", value: 5, h: 34 },
      { id: "h", value: 1, h: 18 },
    ],
    []
  );

  // Slots represent positions; we swap slots (transform-only), not DOM/layout.
  const [slots, setSlots] = useState<string[]>(() => items.map((it) => it.id));
  const slotById = useMemo(() => new Map(slots.map((id, idx) => [id, idx])), [slots]);

  const [comparePair, setComparePair] = useState<[number, number] | null>(null);
  const [swapPair, setSwapPair] = useState<[number, number] | null>(null);
  const [readyPulse, setReadyPulse] = useState(false);
  const [phase, setPhase] = useState<"form" | "wave" | "sweep" | "swap" | "ready">("form");
  const [waveActive, setWaveActive] = useState(true);

  const messages = useMemo(
    () => [
      "Visualizing Algorithms…",
      "Thinking in O(log n)…",
      "Turning Logic into Motion…",
      "Preparing Steps & Debugger…",
    ],
    []
  );
  const [messageIndex, setMessageIndex] = useState(0);

  const startedAtRef = useRef<number>(0);
  const storyDoneRef = useRef(false);
  const finishedOnceRef = useRef(false);
  const appReadyRef = useRef(appReady);

  useEffect(() => {
    appReadyRef.current = appReady;
  }, [appReady]);

  const requestFinish = useCallback(() => {
    if (finishedOnceRef.current) return;
    finishedOnceRef.current = true;
    onFinished?.();
  }, [onFinished]);

  // Layout constants (fixed => no jitter)
  const BAR_W = 16;
  const GAP = 10;
  const COUNT = items.length;
  const ROW_W = BAR_W * COUNT + GAP * (COUNT - 1);

  const xForSlot = (slot: number) => slot * (BAR_W + GAP);
  const centerXForSlot = (slot: number) => xForSlot(slot) + BAR_W / 2;

  // Internal derived durations (no magic numbers, all derived from config)
  const fadeOutS = t.fadeOutMs / 1000;
  const formS = t.formMs / 1000;
  const waveS = t.waveMs / 1000;
  const sweepS = t.sweepMs / 1000;
  const swapS = t.swapMs / 1000;
  const pointerMoveS = sweepS;
  const swapMoveS = swapS;

  const waveStaggerS = waveS / (COUNT * 1.7);
  const waveAmpPx = 3;

  const exitAtMs = clamp(t.maxVisibleMs - t.fadeOutMs, 0, t.maxVisibleMs);

  useEffect(() => {
    if (!show) return;

    // Reset state for a fresh run
    setComparePair(null);
    setSwapPair(null);
    setReadyPulse(false);
    setPhase("form");
    setWaveActive(true);
    setMessageIndex(0);
    setSlots(items.map((it) => it.id));
    storyDoneRef.current = false;
    finishedOnceRef.current = false;

    startedAtRef.current = performance.now();
    const minAt = startedAtRef.current + t.minVisibleMs;

    // Microtext cycle (subtle)
    const msgEvery = Math.max(240, Math.floor((t.maxVisibleMs - t.minVisibleMs) / 3));
    const msgTimer = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % messages.length);
    }, msgEvery);

    // Reduced motion: static composition + gentle fade/pulse only.
    if (reducedMotion) {
      const hardStop = window.setTimeout(() => {
        requestFinish();
      }, exitAtMs);

      const poll = window.setInterval(() => {
        const now = performance.now();
        if (now >= minAt && appReadyRef.current) {
          requestFinish();
        }
      }, 40);

      return () => {
        window.clearInterval(msgTimer);
        window.clearTimeout(hardStop);
        window.clearInterval(poll);
      };
    }

    // Timeline: form -> wave -> sweep (with compare glows) -> swap -> ready
    setPhase("form");

    const toWave = window.setTimeout(() => {
      setPhase("wave");
      setWaveActive(true);
    }, t.formMs);

    const waveOff = window.setTimeout(() => {
      setWaveActive(false);
    }, t.formMs + t.waveMs);

    const toSweep = window.setTimeout(() => {
      setPhase("sweep");
    }, t.formMs + t.waveMs);

    // Compare moments occur during sweep.
    const compareAt1 = t.formMs + t.waveMs + Math.floor(t.sweepMs * 0.32);
    const compareAt2 = t.formMs + t.waveMs + Math.floor(t.sweepMs * 0.70);

    const compareTimer1 = window.setTimeout(() => {
      setComparePair([2, 3]);
    }, compareAt1);

    const compareTimer2 = window.setTimeout(() => {
      setComparePair([5, 6]);
    }, compareAt2);

    const swapStart = t.formMs + t.waveMs + t.sweepMs;
    const swapTimer = window.setTimeout(() => {
      setComparePair(null);
      setSwapPair([3, 4]);
      setPhase("swap");

      setSlots((prev) => {
        const copy = prev.slice();
        const a = 3;
        const b = 4;
        const tmp = copy[a];
        copy[a] = copy[b];
        copy[b] = tmp;
        return copy;
      });
    }, swapStart);

    const readyStart = swapStart + t.swapMs;
    const pulseTimer = window.setTimeout(() => {
      setSwapPair(null);
      setReadyPulse(true);
      setPhase("ready");
    }, readyStart);

    const doneTimer = window.setTimeout(() => {
      storyDoneRef.current = true;
    }, readyStart);

    // Completion logic:
    // - if appReady is quick, still wait for minVisible and (ideally) storyDone
    // - if appReady is slow, keep showing but never beyond maxVisible (minus fade)
    const hardStop = window.setTimeout(() => {
      requestFinish();
    }, exitAtMs);

    const poll = window.setInterval(() => {
      const now = performance.now();
      const minReached = now >= minAt;

      if (minReached && appReadyRef.current && storyDoneRef.current) {
        requestFinish();
      }

      // If app is ready and min reached but story hasn't finished,
      // do not delay beyond the configured max (hardStop already covers this).
    }, 30);

    return () => {
      window.clearInterval(msgTimer);
      window.clearTimeout(toWave);
      window.clearTimeout(waveOff);
      window.clearTimeout(toSweep);
      window.clearTimeout(compareTimer1);
      window.clearTimeout(compareTimer2);
      window.clearTimeout(swapTimer);
      window.clearTimeout(pulseTimer);
      window.clearTimeout(doneTimer);
      window.clearTimeout(hardStop);
      window.clearInterval(poll);
    };
  }, [exitAtMs, items, messages.length, reducedMotion, requestFinish, show, t.formMs, t.maxVisibleMs, t.minVisibleMs, t.sweepMs, t.swapMs, t.waveMs]);

  const overlayVariants = {
    hidden: { opacity: 0, scale: 1.01 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: fadeOutS * 0.85, ease: EASE_OUT },
    },
    exit: {
      opacity: 0,
      scale: 0.98,
      transition: { duration: fadeOutS, ease: EASE_OUT },
    },
  };

  const pointerColorClass = swapPair
    ? "bg-swap"
    : readyPulse
      ? "bg-sorted"
      : "bg-compare";

  const pointerStemClass = swapPair
    ? "bg-swap/60"
    : readyPulse
      ? "bg-sorted/60"
      : "bg-compare/60";

  const barBaseClass = "bg-muted-foreground/25 border border-border";

  const pointerTargetX =
    phase === "sweep"
      ? centerXForSlot(COUNT - 1)
      : centerXForSlot(COUNT - 1);

  const pointerInitialX = centerXForSlot(0);

  const pointerStroke =
    phase === "swap"
      ? "hsl(var(--swap) / 0.95)"
      : phase === "ready"
        ? "hsl(var(--sorted) / 0.95)"
        : "hsl(var(--compare) / 0.95)";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="instant-algo-pulse"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/80 backdrop-blur-sm"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          aria-busy="true"
          aria-live="polite"
        >
          {/* Subtle glow + faint grid */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 38%, hsl(var(--primary) / 0.16), transparent 60%), radial-gradient(circle at 30% 65%, hsl(var(--compare) / 0.10), transparent 55%), radial-gradient(circle at 70% 65%, hsl(var(--swap) / 0.08), transparent 55%), linear-gradient(hsl(var(--border) / 0.22) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.22) 1px, transparent 1px)",
              backgroundSize: "auto, auto, auto, 56px 56px, 56px 56px",
              backgroundPosition: "center, center, center, center, center",
            }}
          />

          {/* Very light noise layer (SVG data URI, tiny + cheap) */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay"
            style={{
              backgroundImage:
                "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)' opacity='.35'/%3E%3C/svg%3E\")",
            }}
          />

          <motion.div
            className="relative w-[min(520px,92vw)] rounded-2xl border border-border bg-card/70 shadow-2xl"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0, transition: { duration: fadeOutS * 0.85, ease: EASE_OUT } }}
          >
            <div className="px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground truncate">{brand}</div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground/80">
                    {subtext ?? messages[messageIndex]}
                  </div>
                </div>

                {/* Small non-intrusive pulse indicator */}
                <motion.div
                  className="h-2 w-2 rounded-full bg-primary"
                  animate={reducedMotion ? { opacity: [0.4, 0.9, 0.4] } : readyPulse ? { scale: [1, 1.25, 1], opacity: [0.7, 1, 0.7] } : { opacity: [0.35, 0.75, 0.35] }}
                  transition={{ duration: Math.max(0.24, fadeOutS), ease: EASE_OUT, repeat: Infinity }}
                />
              </div>

              <div className="mt-5 rounded-xl border border-border bg-background/35 p-4">
                {/* Bars + pointer stage */}
                <div className="relative mx-auto" style={{ width: ROW_W, height: 92 }}>
                  {/* Nodes (dots) that appear first and then fade as bars take over */}
                  {!reducedMotion && (
                    <motion.div
                      className="absolute left-0 top-[18px] h-[20px] w-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: phase === "form" ? 1 : 0 }}
                      transition={{ duration: formS * 0.6, ease: EASE_OUT }}
                    >
                      {items.map((it) => {
                        const slot = slotById.get(it.id) ?? 0;
                        return (
                          <motion.div
                            key={`node-${it.id}`}
                            className="absolute top-0 h-2 w-2 rounded-full bg-primary/60"
                            style={{ left: centerXForSlot(slot) - 4 }}
                            initial={{ opacity: 0, scale: 0.6, y: -6 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            transition={{
                              duration: formS * 0.75,
                              ease: EASE_OUT,
                              delay: (slot / Math.max(1, COUNT - 1)) * (formS * 0.35),
                            }}
                          />
                        );
                      })}
                    </motion.div>
                  )}

                  <div className="absolute left-0 top-2 h-[56px] w-full">
                    {items.map((it) => {
                      const slot = slotById.get(it.id) ?? 0;
                      const isCompare = comparePair != null && (slot === comparePair[0] || slot === comparePair[1]);
                      const isSwap = swapPair != null && (slot === swapPair[0] || slot === swapPair[1]);
                      const isReady = readyPulse && slot === COUNT - 1;

                      const barClass = isReady
                        ? "bg-sorted/20 border border-sorted/40"
                        : isSwap
                          ? "bg-swap/20 border border-swap/40"
                          : isCompare
                            ? "bg-compare/20 border border-compare/40"
                            : barBaseClass;

                      return (
                        <motion.div
                          key={it.id}
                          className={`absolute bottom-0 w-[16px] rounded-md ${barClass}`}
                          style={{ height: it.h }}
                          animate={
                            reducedMotion
                              ? { x: xForSlot(slot), y: 0, opacity: 1 }
                              : {
                                  x: xForSlot(slot),
                                  y: waveActive ? [0, -waveAmpPx, 0] : 0,
                                  opacity:
                                    phase === "form"
                                      ? 0
                                      : waveActive
                                        ? isCompare
                                          ? [1, 1, 0.96]
                                          : [0.9, 1, 0.9]
                                        : 1,
                                }
                          }
                          transition={
                            reducedMotion
                              ? { duration: 0 }
                              : {
                                  x: { duration: isSwap ? swapMoveS : swapMoveS * 0.65, ease: EASE_OUT },
                                  y: {
                                    duration: waveS,
                                    ease: EASE_OUT,
                                    repeat: waveActive ? Infinity : 0,
                                    delay: slot * waveStaggerS,
                                  },
                                  opacity: {
                                    duration: phase === "form" ? formS * 0.75 : waveS,
                                    ease: EASE_OUT,
                                    repeat: waveActive ? Infinity : 0,
                                    delay: slot * waveStaggerS,
                                  },
                                }
                          }
                        >
                          {/* Soft glow ring (opacity-only) */}
                          <motion.div
                            className={`pointer-events-none absolute inset-[-2px] rounded-md border ${
                              isReady
                                ? "border-sorted/35"
                                : isSwap
                                  ? "border-swap/35"
                                  : "border-compare/35"
                            }`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: isReady || isSwap || isCompare ? 1 : 0 }}
                            transition={{ duration: waveS * 0.35, ease: EASE_OUT }}
                          />
                          <span className="pointer-events-none absolute inset-0 flex items-end justify-center pb-[2px] text-[9px] font-mono text-foreground/75">
                            {it.value}
                          </span>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Pointer below bars (never covers) */}
                  {!reducedMotion && phase !== "form" && (
                    <motion.div
                      className="absolute left-0 top-[66px]"
                      initial={{ x: pointerInitialX }}
                      animate={{ x: pointerTargetX }}
                      transition={{ duration: pointerMoveS, ease: EASE_OUT }}
                    >
                      <div className="relative -translate-x-1/2">
                        <div className={`h-2 w-2 rounded-full ${pointerColorClass}`} />
                        <div className={`mt-1 h-6 w-[2px] rounded-full ${pointerStemClass}`} />
                        <svg width="14" height="8" viewBox="0 0 14 8" className="mt-1">
                          <path
                            d="M1 7 L7 1 L13 7"
                            fill="none"
                            stroke={pointerStroke}
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                    </motion.div>
                  )}

                  {/* Swap micro-arrow (fast, readable, under bars) */}
                  <AnimatePresence>
                    {phase === "swap" && !reducedMotion && (
                      <motion.svg
                        className="pointer-events-none absolute left-0 top-[70px]"
                        width={ROW_W}
                        height={32}
                        viewBox={`0 0 ${ROW_W} 32`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        {(() => {
                          const x1 = centerXForSlot(3);
                          const x2 = centerXForSlot(4);
                          const mid = (x1 + x2) / 2;
                          const d = `M ${x1} 18 C ${mid} 4, ${mid} 4, ${x2} 18`;
                          return (
                            <>
                              <motion.path
                                d={d}
                                fill="none"
                                stroke="hsl(var(--foreground) / 0.07)"
                                strokeWidth={6}
                                strokeLinecap="round"
                              />
                              <motion.path
                                d={d}
                                fill="none"
                                stroke="hsl(var(--swap) / 0.95)"
                                strokeWidth={2.5}
                                strokeLinecap="round"
                                strokeDasharray={96}
                                strokeDashoffset={96}
                                animate={{ strokeDashoffset: 0 }}
                                transition={{ duration: swapMoveS, ease: EASE_OUT }}
                              />
                            </>
                          );
                        })()}
                      </motion.svg>
                    )}
                  </AnimatePresence>

                  {/* Ready pulse ring */}
                  <AnimatePresence>
                    {readyPulse && !reducedMotion && (
                      <motion.div
                        className="pointer-events-none absolute left-0 top-2"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                      >
                        <motion.div
                          className="absolute"
                          style={{
                            left: centerXForSlot(COUNT - 1) - 18,
                            top: 12,
                            width: 36,
                            height: 36,
                            borderRadius: 999,
                            border: "1px solid hsl(var(--sorted) / 0.40)",
                          }}
                          animate={{ scale: [0.9, 1.15, 1.28], opacity: [0.25, 0.75, 0] }}
                          transition={{ duration: Math.max(0.22, swapS), ease: EASE_OUT, repeat: Infinity }}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-compare" /> compare
                    <span className="h-2 w-2 rounded-full bg-swap ml-3" /> swap
                    <span className="h-2 w-2 rounded-full bg-sorted ml-3" /> ready
                  </span>
                  <span className="opacity-70">{reducedMotion ? "Reduced motion" : ""}</span>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
