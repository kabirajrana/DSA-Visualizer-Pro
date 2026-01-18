import React, { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from "framer-motion";

type PreloaderProps = {
  show: boolean;
  brand?: string;
  tagline?: string;
};

type Bar = {
  id: string;
  value: number;
};

const LOADING_MESSAGES = [
  "Loading Visualizer…",
  "Loading Steps…",
  "Loading Debugger…",
  "Warming up Animations…",
  "Preparing Comparisons…",
];

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const AppPreloader: React.FC<PreloaderProps> = ({
  show,
  brand = "DSA Visualizer",
  tagline = "Visual Algorithm Learning",
}) => {
  const reducedMotion = useReducedMotion();

  const [messageIndex, setMessageIndex] = useState(0);
  useEffect(() => {
    if (!show) return;
    const timer = window.setInterval(() => {
      setMessageIndex((i) => (i + 1) % LOADING_MESSAGES.length);
    }, 900);
    return () => window.clearInterval(timer);
  }, [show]);

  const initialBars = useMemo<Bar[]>(
    () => [
      { id: "a", value: 28 },
      { id: "b", value: 54 },
      { id: "c", value: 36 },
      { id: "d", value: 62 },
      { id: "e", value: 44 },
    ],
    [],
  );

  const [bars, setBars] = useState<Bar[]>(initialBars);
  const [comparePair, setComparePair] = useState<[number, number] | null>(null);

  const iRef = useRef(0);
  const passRef = useRef(0);

  useEffect(() => {
    if (!show || reducedMotion) return;

    // Tiny bubble-sort loop: compare adjacent bars and swap if needed.
    const timer = window.setInterval(() => {
      setBars((prev) => {
        if (prev.length < 2) return prev;

        let i = iRef.current;
        const nextI = i + 1;

        if (nextI >= prev.length) {
          // new pass
          passRef.current += 1;
          iRef.current = 0;
          i = 0;
        }

        const a = i;
        const b = clamp(i + 1, 0, prev.length - 1);
        setComparePair([a, b]);

        // Swap on alternating passes to keep motion interesting even on partially sorted patterns.
        const shouldSwap = prev[a].value > prev[b].value || passRef.current % 2 === 1;

        iRef.current = i + 1;

        if (!shouldSwap) return prev;

        const copy = prev.slice();
        const tmp = copy[a];
        copy[a] = copy[b];
        copy[b] = tmp;
        return copy;
      });
    }, 760);

    return () => window.clearInterval(timer);
  }, [reducedMotion, show]);

  const overlayVariants = {
    hidden: { opacity: 0, scale: 1.01 },
    visible: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.01, transition: { duration: 0.26, ease: EASE_OUT } },
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: EASE_OUT } },
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="app-preloader"
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-background/85 backdrop-blur-md"
          initial="hidden"
          animate="visible"
          exit="exit"
          variants={overlayVariants}
          aria-busy="true"
          aria-live="polite"
        >
          <motion.div
            className="w-[min(520px,92vw)] rounded-2xl border border-border bg-card/70 shadow-2xl"
            variants={cardVariants}
          >
            <div className="p-6 sm:p-7">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-lg sm:text-xl font-bold text-foreground truncate">{brand}</div>
                  <div className="mt-0.5 text-sm text-muted-foreground">{tagline}</div>
                </div>

                <div className="shrink-0 inline-flex items-center gap-2 rounded-full border border-border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                  <span className="h-2 w-2 rounded-full bg-primary/70" />
                  <span className="font-medium">{LOADING_MESSAGES[messageIndex]}</span>
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-border bg-background/40 p-4">
                {reducedMotion ? (
                  <div className="flex items-center justify-center gap-3 py-6">
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
                    />
                    <motion.div
                      className="h-2 w-2 rounded-full bg-primary"
                      animate={{ opacity: [0.35, 1, 0.35] }}
                      transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.3 }}
                    />
                    <span className="text-sm text-muted-foreground">Loading…</span>
                  </div>
                ) : (
                  <LayoutGroup>
                    <div className="relative mx-auto flex w-full max-w-[420px] items-end justify-center gap-3 py-6">
                      {/* subtle algorithmic "compare" rail */}
                      <motion.div
                        className="pointer-events-none absolute -bottom-2 left-1/2 h-[2px] w-[72%] -translate-x-1/2 rounded-full bg-primary/15"
                        animate={{ opacity: [0.25, 0.6, 0.25] }}
                        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                      />

                      {bars.map((bar, idx) => {
                        const isComparing =
                          comparePair != null && (idx === comparePair[0] || idx === comparePair[1]);

                        return (
                          <motion.div
                            key={bar.id}
                            layout
                            className="relative will-change-transform"
                            transition={{
                              layout: { duration: 0.42, ease: EASE_OUT },
                            }}
                          >
                            <motion.div
                              className={`w-10 sm:w-11 rounded-xl border bg-card/60 ${
                                isComparing
                                  ? "border-primary/60 shadow-[0_0_0_1px_rgba(79,156,255,0.25),0_0_28px_rgba(79,156,255,0.18)]"
                                  : "border-border"
                              }`}
                              style={{ height: 22 + bar.value }}
                              animate={
                                isComparing
                                  ? { y: [0, -6, 0], opacity: 1 }
                                  : { y: 0, opacity: 0.92 }
                              }
                              transition={{ duration: 0.62, ease: EASE_OUT }}
                            />

                            {/* tiny compare marker */}
                            {isComparing && (
                              <motion.div
                                className="absolute -top-3 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-primary"
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.85 }}
                              />
                            )}
                          </motion.div>
                        );
                      })}
                    </div>

                    <div className="mt-1 text-center text-xs text-muted-foreground">
                      Comparing • Swapping • Sorting
                    </div>
                  </LayoutGroup>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-compare" /> Compare
                  <span className="h-2 w-2 rounded-full bg-swap ml-3" /> Swap
                  <span className="h-2 w-2 rounded-full bg-sorted ml-3" /> Sorted
                </span>
                <span className="opacity-70">Initializing…</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
