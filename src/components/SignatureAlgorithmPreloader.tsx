import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

type SignatureAlgorithmPreloaderProps = {
  show: boolean;
  brand?: string;
  tagline?: string;
  appReady?: boolean;
  timing?: Partial<typeof PRELOADER_TIMING>;
  onFinished?: () => void;
};

type Scene = 1 | 2 | 3;

type Chip = { step: string; label: string };

type Item = { id: string; value: number };

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const PRELOADER_TIMING = {
  minVisibleMs: 1200,
  sceneMs: 700,
  fadeOutMs: 400,
  totalMaxMs: 3500,
} as const;

const TIPS = [
  "Tip: Comparisons don’t always mean swaps.",
  "Tip: Binary search needs sorted data.",
  "Tip: Merge sort is stable.",
  "Tip: Quick sort is usually in-place.",
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

export const SignatureAlgorithmPreloader: React.FC<SignatureAlgorithmPreloaderProps> = ({
  show,
  brand = "AlgoVista",
  tagline = "Visual Algorithm Learning",
  appReady = true,
  timing,
  onFinished,
}) => {
  const reducedMotion = useReducedMotion();

  const t = useMemo(
    () => ({ ...PRELOADER_TIMING, ...(timing ?? {}) }),
    [timing]
  );

  const fadeOutS = t.fadeOutMs / 1000;
  const sceneS = t.sceneMs / 1000;
  const introS = Math.max(0.18, fadeOutS * 0.65);
  const pointerMoveS = Math.max(0.22, sceneS * 0.55);
  const layoutSwapS = Math.max(pointerMoveS, sceneS * 0.85);
  const pulseS = Math.max(0.55, sceneS * 0.9);

  const TOTAL_MS = t.sceneMs * 3;

  const [scene, setScene] = useState<Scene>(1);
  const [chip, setChip] = useState<Chip>({ step: "S1", label: "Compare" });
  const [tipIndex, setTipIndex] = useState(0);

  // 8-element “array” (kept tiny, stable)
  const initialValues = useMemo(() => [8, 3, 6, 2, 7, 4, 1, 5], []);
  const initialItems = useMemo<Item[]>(
    () => initialValues.map((value) => ({ id: String(value), value })),
    [initialValues]
  );
  const [items, setItems] = useState<Item[]>(initialItems);

  // Indices used for micro-story
  const scanIndexRef = useRef(0);
  const [comparePair, setComparePair] = useState<[number, number] | null>([0, 1]);
  const swapPair: [number, number] = [3, 5];
  const foundIndex = 6;

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

  // Progress snaps: 0 → 1/3 → 2/3 → 1
  const progress = scene === 1 ? 0.34 : scene === 2 ? 0.67 : 1;

  // Layout constants (no measuring => no jitter)
  const CELL_W = 44;
  const GAP = 10;
  const ROW_W = CELL_W * 8 + GAP * 7;

  const xForIndex = (idx: number) => -ROW_W / 2 + idx * (CELL_W + GAP) + CELL_W / 2;

  useEffect(() => {
    if (!show) return;

    // reset on each show
    setScene(1);
    setChip({ step: "S1", label: "Compare" });
    setItems(initialItems);
    scanIndexRef.current = 0;
    setComparePair([0, 1]);
    storyDoneRef.current = false;
    finishedOnceRef.current = false;

    const startAt = performance.now();
    const minAt = startAt + t.minVisibleMs;

    let tipTimer: number | null = null;
    tipTimer = window.setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
    }, Math.max(t.sceneMs * 2, 900));

    if (reducedMotion) {
      const doneTimer = window.setTimeout(() => {
        if (tipTimer) window.clearInterval(tipTimer);
        requestFinish();
      }, t.minVisibleMs);

      return () => {
        if (tipTimer) window.clearInterval(tipTimer);
        window.clearTimeout(doneTimer);
      };
    }

    // Scene 1: scan / compare sweep
    const scanTickMs = Math.max(130, Math.floor(t.sceneMs / 4));
    const scanTick = window.setInterval(() => {
      const i = scanIndexRef.current;
      const a = clamp(i, 0, 6);
      const b = clamp(i + 1, 1, 7);
      setComparePair([a, b]);
      scanIndexRef.current = i + 1;
    }, scanTickMs);

    const s2 = window.setTimeout(() => {
      window.clearInterval(scanTick);
      setScene(2);
      setChip({ step: "S2", label: "Swap" });

      // perform one “swap” by reordering values (layout animates)
      setItems((prev) => {
        const copy = prev.slice();
        const [a, b] = swapPair;
        const tmp = copy[a];
        copy[a] = copy[b];
        copy[b] = tmp;
        return copy;
      });

      // keep comparePair on swapped indices during swap
      setComparePair([swapPair[0], swapPair[1]]);
    }, t.sceneMs);

    const s3 = window.setTimeout(() => {
      setScene(3);
      setChip({ step: "S3", label: "Found" });
      setComparePair([foundIndex, foundIndex]);
    }, t.sceneMs * 2);

    const markDone = window.setTimeout(() => {
      storyDoneRef.current = true;
    }, TOTAL_MS);

    // Safety: never block forever
    const safety = window.setTimeout(() => {
      if (tipTimer) window.clearInterval(tipTimer);
      requestFinish();
    }, t.totalMaxMs);

    // Drive completion based on (story done) AND (min visible reached) AND (app ready)
    const completionPoll = window.setInterval(() => {
      const now = performance.now();
      const minReached = now >= minAt;
      if (minReached && appReadyRef.current && storyDoneRef.current) {
        if (tipTimer) window.clearInterval(tipTimer);
        requestFinish();
      }
    }, 50);

    return () => {
      if (tipTimer) window.clearInterval(tipTimer);
      window.clearInterval(scanTick);
      window.clearTimeout(s2);
      window.clearTimeout(s3);
      window.clearTimeout(markDone);
      window.clearTimeout(safety);
      window.clearInterval(completionPoll);
    };
  }, [TOTAL_MS, foundIndex, initialItems, reducedMotion, requestFinish, show, swapPair, t.minVisibleMs, t.sceneMs, t.totalMaxMs]);

  const overlay = {
    hidden: { opacity: 0, scale: 1.01 },
    visible: { opacity: 1, scale: 1, transition: { duration: introS, ease: EASE_OUT } },
    exit: { opacity: 0, scale: 0.98, transition: { duration: fadeOutS, ease: EASE_OUT } },
  };

  const card = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: introS, ease: EASE_OUT } },
  };

  const chipColorClass =
    scene === 1
      ? "bg-compare/15 text-compare border-compare/25"
      : scene === 2
        ? "bg-swap/15 text-swap border-swap/25"
        : "bg-sorted/15 text-sorted border-sorted/25";

  const chipDotClass = scene === 1 ? "bg-compare" : scene === 2 ? "bg-swap" : "bg-sorted";

  const pointerClass = scene === 1 ? "bg-compare" : scene === 2 ? "bg-swap" : "bg-sorted";
  const pointerStemClass = scene === 1 ? "bg-compare/60" : scene === 2 ? "bg-swap/60" : "bg-sorted/60";

  const progressFillClass =
    scene === 1 ? "bg-compare/70" : scene === 2 ? "bg-swap/70" : "bg-sorted/70";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="signature-preloader"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 backdrop-blur-md"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlay}
          aria-busy="true"
          aria-live="polite"
        >
          {/* Subtle grid + glow background */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.55]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 50% 35%, hsl(var(--primary) / 0.18), transparent 55%), linear-gradient(hsl(var(--border) / 0.25) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border) / 0.25) 1px, transparent 1px)",
              backgroundSize: "auto, 44px 44px, 44px 44px",
              backgroundPosition: "center, center, center",
            }}
          />

          <motion.div
            className="relative w-[min(660px,92vw)] rounded-2xl border border-border bg-card/70 shadow-2xl"
            variants={card}
          >
            <div className="p-6 sm:p-7">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-foreground truncate">{brand}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{tagline}</div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${chipColorClass}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${chipDotClass}`} />
                    <span className="font-mono">{chip.step}</span>
                    <span>{chip.label}</span>
                  </span>

                  <span className="hidden sm:inline text-xs text-muted-foreground">{TIPS[tipIndex]}</span>
                </div>
              </div>

              {/* Scene progress (snaps per scene) */}
              <div className="mt-4">
                <div className="h-2 w-full rounded-full bg-muted/50 overflow-hidden border border-border">
                  <motion.div
                    className={`h-full ${progressFillClass}`}
                    initial={{ width: "0%" }}
                    animate={{ width: `${Math.round(progress * 100)}%` }}
                    transition={{ duration: Math.max(0.22, introS * 0.9), ease: EASE_OUT }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className={scene >= 1 ? "text-foreground" : ""}>Scan</span>
                  <span className={scene >= 2 ? "text-foreground" : ""}>Swap</span>
                  <span className={scene >= 3 ? "text-foreground" : ""}>Found</span>
                </div>
              </div>

              {/* Mini-story stage */}
              <div className="mt-6 rounded-xl border border-border bg-background/40 p-4 sm:p-5">
                {reducedMotion ? (
                  <div className="text-center">
                    <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                      Reduced motion enabled
                    </div>
                    <div className="mt-4 flex items-center justify-center gap-2">
                      {initialValues.map((v, idx) => (
                        <div
                          key={idx}
                          className="h-10 w-10 rounded-xl border border-border bg-card/60 flex items-center justify-center text-sm font-semibold text-foreground"
                        >
                          {v}
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">Loading…</div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="flex items-center justify-center">
                      <div
                        className="relative"
                        style={{ width: ROW_W, height: 96 }}
                      >
                        {/* Array blocks (numbers always visible) */}
                        <div className="absolute left-1/2 top-2 -translate-x-1/2 flex items-start gap-[10px]">
                          {items.map((item, idx) => {
                            const isComparing =
                              comparePair != null && (idx === comparePair[0] || idx === comparePair[1]);
                            const isSwapping = scene === 2 && (idx === swapPair[0] || idx === swapPair[1]);
                            const isFound = scene === 3 && idx === foundIndex;

                            return (
                              <motion.div
                                key={item.id}
                                layout
                                className={`relative h-[44px] w-[44px] rounded-xl border flex items-center justify-center text-sm font-semibold select-none will-change-transform ${
                                  isFound
                                    ? "border-sorted/50 bg-sorted/10 text-sorted shadow-[0_0_0_1px_rgba(16,185,129,0.25),0_0_32px_rgba(16,185,129,0.18)]"
                                    : isSwapping
                                      ? "border-swap/50 bg-swap/10 text-foreground"
                                      : isComparing
                                        ? "border-compare/50 bg-compare/10 text-foreground"
                                        : "border-border bg-card/60 text-foreground"
                                }`}
                                transition={{
                                  layout: { duration: layoutSwapS, ease: EASE_OUT },
                                }}
                                animate={
                                  isComparing && scene === 1
                                    ? { y: [0, -4, 0] }
                                    : isFound
                                      ? { scale: [1, 1.04, 1] }
                                      : { y: 0, scale: 1 }
                                }
                                style={{
                                  boxShadow: isSwapping
                                    ? "0 0 0 1px hsl(var(--primary) / 0.08) inset"
                                    : undefined,
                                }}
                              >
                                {item.value}

                                {/* Found pulse ring */}
                                {isFound && (
                                  <motion.div
                                    className="pointer-events-none absolute inset-[-6px] rounded-2xl border border-sorted/40"
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: [0.2, 0.9, 0], scale: [0.98, 1.06, 1.12] }}
                                    transition={{ duration: pulseS, ease: EASE_OUT, repeat: Infinity }}
                                  />
                                )}
                              </motion.div>
                            );
                          })}
                        </div>

                        {/* Pointer below blocks (never covers numbers) */}
                        <motion.div
                          className="absolute left-1/2 top-[64px]"
                          animate={{
                            x:
                              scene === 1 && comparePair
                                ? xForIndex(comparePair[1])
                                : scene === 2
                                  ? xForIndex(swapPair[1])
                                  : xForIndex(foundIndex),
                          }}
                          transition={{ duration: pointerMoveS, ease: EASE_OUT }}
                        >
                          <div className="relative">
                            <div className={`h-2 w-2 rounded-full ${pointerClass}`} />
                            <div
                              className={`absolute left-1/2 top-2 h-6 w-[2px] -translate-x-1/2 rounded-full ${pointerStemClass}`}
                            />
                          </div>
                        </motion.div>

                        {/* Swap curved arrow (scene 2) */}
                        <AnimatePresence>
                          {scene === 2 && (
                            <motion.svg
                              className="absolute left-1/2 top-[72px] -translate-x-1/2"
                              width={ROW_W}
                              height={52}
                              viewBox={`0 0 ${ROW_W} 52`}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                            >
                              {(() => {
                                const x1 = ROW_W / 2 + xForIndex(swapPair[0]);
                                const x2 = ROW_W / 2 + xForIndex(swapPair[1]);
                                const mid = (x1 + x2) / 2;
                                const d = `M ${x1} 30 C ${mid} 6, ${mid} 6, ${x2} 30`;

                                return (
                                  <>
                                    <motion.path
                                      d={d}
                                      fill="none"
                                      stroke="hsl(var(--foreground) / 0.08)"
                                      strokeWidth={8}
                                      strokeLinecap="round"
                                    />
                                    <motion.path
                                      d={d}
                                      fill="none"
                                      stroke="hsl(var(--swap) / 0.95)"
                                      strokeWidth={3}
                                      strokeLinecap="round"
                                      strokeDasharray={160}
                                      strokeDashoffset={160}
                                      animate={{ strokeDashoffset: 0 }}
                                      transition={{ duration: layoutSwapS, ease: EASE_OUT }}
                                    />
                                    <motion.circle
                                      cx={x2}
                                      cy={30}
                                      r={4}
                                      fill="hsl(var(--swap) / 0.95)"
                                      initial={{ scale: 0.7, opacity: 0 }}
                                      animate={{ scale: 1, opacity: 1 }}
                                      transition={{ duration: Math.max(0.18, introS * 0.8), ease: EASE_OUT }}
                                    />
                                  </>
                                );
                              })()}
                            </motion.svg>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-compare" /> Compare
                        <span className="h-2 w-2 rounded-full bg-swap ml-3" /> Swap
                        <span className="h-2 w-2 rounded-full bg-sorted ml-3" /> Found
                      </span>
                      <span className="opacity-75">Loading modules…</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 sm:hidden text-xs text-muted-foreground">{TIPS[tipIndex]}</div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
