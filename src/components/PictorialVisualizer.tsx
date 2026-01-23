import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { StepRow } from './StepRow';
import { Legend } from './Legend';
import { BarChart3, Eye, Layers, Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import { BarChartStep } from './BarChartStep';
import { Button } from '@/components/ui/button';
import { buildMergeTree } from '@/lib/algorithms/sorting/buildMergeTree';
import { MergeSortTreeDiagram } from '@/components/MergeSortTreeDiagram';
import { buildQuickSortTree } from '@/lib/algorithms/sorting/buildQuickSortTree';
import { QuickSortTreeDiagram } from '@/components/QuickSortTreeDiagram';

type ActiveIndicator = { y: number; height: number } | null;

export const PictorialVisualizer: React.FC = () => {
  const { 
    steps, 
    currentStepIndex, 
    viewMode, 
    isPlaying, 
    playbackSpeed, 
    algorithm,
    nextStep,
    prevStep,
    play,
    pause,
    reset
  } = useDebuggerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const treeSectionRef = useRef<HTMLDivElement>(null);
  const quickTreeSectionRef = useRef<HTMLDivElement>(null);
  const [animatingStepIndex, setAnimatingStepIndex] = useState(0);
  const prevStepIndexRef = useRef<number>(0);
  const [activeIndicator, setActiveIndicator] = useState<ActiveIndicator>(null);
  const [showMergeTree, setShowMergeTree] = useState(false);
  const [showQuickTree, setShowQuickTree] = useState(false);
  const [quickAutoOpenFullscreen, setQuickAutoOpenFullscreen] = useState(false);

  const isMergeSort = algorithm === 'merge-sort';
  const isQuickSort = algorithm === 'quick-sort';
  const isAtEnd = steps.length > 0 && currentStepIndex === steps.length - 1;
  const currentStep = steps[currentStepIndex];
  const isFullySortedStep = useMemo(() => {
    if (!currentStep) return false;
    const labelSaysSorted = currentStep.label.toLowerCase().includes('sorted');
    const sortedCount = (currentStep.highlights?.after?.sorted?.length ?? 0) || (currentStep.highlights?.before?.sorted?.length ?? 0);
    const n = Math.max(currentStep.after?.length ?? 0, currentStep.before?.length ?? 0);
    return labelSaysSorted || (n > 0 && sortedCount >= n);
  }, [currentStep]);

  const mergeTreeRoot = useMemo(() => {
    if (!isMergeSort) return null;
    const input = steps[0]?.before ?? [];
    if (!input.length) return null;
    return buildMergeTree(input);
  }, [isMergeSort, steps]);

  const quickTree = useMemo(() => {
    if (!isQuickSort) return null;
    const input = steps[0]?.before ?? [];
    if (!input.length) return null;
    return buildQuickSortTree(input);
  }, [isQuickSort, steps]);

  const shouldShowMergeTreeSection = isMergeSort && isAtEnd && isFullySortedStep && !!mergeTreeRoot;
  const shouldShowQuickTreeSection = isQuickSort && isAtEnd && isFullySortedStep && !!quickTree;

  const handleShowMergeTree = () => {
    if (showMergeTree) {
      setShowMergeTree(false);
      return;
    }

    setShowMergeTree(true);
    requestAnimationFrame(() => {
      treeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Offset for sticky headers (both page + internal scroller).
      window.scrollBy({ top: -80, left: 0, behavior: 'smooth' });
      containerRef.current?.scrollBy({ top: -80, left: 0, behavior: 'smooth' });
    });
  };

  const handleShowQuickTree = () => {
    if (showQuickTree) {
      setShowQuickTree(false);
      setQuickAutoOpenFullscreen(false);
      return;
    }

    setShowQuickTree(true);
    setQuickAutoOpenFullscreen(true);
    requestAnimationFrame(() => {
      quickTreeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.scrollBy({ top: -80, left: 0, behavior: 'smooth' });
      containerRef.current?.scrollBy({ top: -80, left: 0, behavior: 'smooth' });
    });
  };

  // Reset the tree toggle on new runs/algorithm changes.
  useEffect(() => {
    setShowMergeTree(false);
    setShowQuickTree(false);
    setQuickAutoOpenFullscreen(false);
  }, [algorithm, steps]);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    // Bars view is intentionally slower so indicators are readable.
    const effectiveSpeed = viewMode === 'bars' ? Math.max(playbackSpeed, 1400) : playbackSpeed;
    const timer = setInterval(() => {
      nextStep();
    }, effectiveSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, nextStep, viewMode]);

  // Sync animating step with current step
  useEffect(() => {
    setAnimatingStepIndex(currentStepIndex);
  }, [currentStepIndex]);

  // Pictorial active-step indicator: animate like Focus mode (explicit y/height tween).
  // This indicator is driven only by the explicit currentStepIndex (no inference from DOM mutations).
  useLayoutEffect(() => {
    if (viewMode !== 'pictorial') {
      setActiveIndicator(null);
      return;
    }

    const list = listRef.current;
    if (!list) {
      setActiveIndicator(null);
      return;
    }

    const activeRow = list.querySelector(`[data-step="${currentStepIndex}"]`) as HTMLElement | null;
    if (!activeRow) {
      setActiveIndicator(null);
      return;
    }

    const listRect = list.getBoundingClientRect();
    const rowRect = activeRow.getBoundingClientRect();

    // Match the previous -inset-1 look.
    const inset = 4;
    const y = Math.round(rowRect.top - listRect.top) - inset;
    const height = Math.round(rowRect.height) + inset * 2;
    setActiveIndicator({ y, height });
  }, [currentStepIndex, steps.length, viewMode]);

  // Pictorial mode guidance: keep the active step in a consistent viewport position
  // so it doesn't appear to drift downward as steps progress. This scrolls ONLY the
  // internal visualizer container (no page layout shift).
  useEffect(() => {
    if (viewMode !== 'pictorial' || !containerRef.current) {
      prevStepIndexRef.current = currentStepIndex;
      return;
    }

    const container = containerRef.current;
    const activeRow = container.querySelector(`[data-step="${currentStepIndex}"]`) as HTMLElement | null;
    if (!activeRow) {
      prevStepIndexRef.current = currentStepIndex;
      return;
    }

    const containerRect = container.getBoundingClientRect();
    const rowRect = activeRow.getBoundingClientRect();

    // Merge Sort UX: keep the visual area stable on Next/Previous.
    // Only scroll the internal container if the active row is drifting out of view.
    if (algorithm === 'merge-sort' || algorithm === 'quick-sort') {
      const topSafe = containerRect.top + 70;
      const bottomSafe = containerRect.bottom - 70;
      const needsScroll = rowRect.top < topSafe || rowRect.bottom > bottomSafe;

      if (needsScroll) {
        const stepDelta = Math.abs(currentStepIndex - prevStepIndexRef.current);
        const behavior: ScrollBehavior = stepDelta <= 1 ? 'smooth' : 'auto';
        activeRow.scrollIntoView({ behavior, block: 'nearest' });
      }

      prevStepIndexRef.current = currentStepIndex;
      return;
    }

    // Keep the active row around ~35% from the top (reads like a guided timeline).
    const desiredOffset = Math.round(containerRect.height * 0.35);
    const currentOffset = Math.round(rowRect.top - containerRect.top);
    const delta = currentOffset - desiredOffset;

    // Only adjust if noticeably off; avoids micro-jitter.
    if (Math.abs(delta) > 8) {
      const nextTop = container.scrollTop + delta;
      const stepDelta = Math.abs(currentStepIndex - prevStepIndexRef.current);
      const behavior: ScrollBehavior = stepDelta <= 1 ? 'smooth' : 'auto';
      container.scrollTo({ top: Math.max(0, nextTop), behavior });
    }

    prevStepIndexRef.current = currentStepIndex;
  }, [currentStepIndex, viewMode]);

  // When we reach the sorted end state for Merge Sort, ensure the Tree controls are visible
  // without requiring the user to scroll.
  useEffect(() => {
    if (!shouldShowMergeTreeSection) return;
    const id = requestAnimationFrame(() => {
      treeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [shouldShowMergeTreeSection]);

  useEffect(() => {
    if (!shouldShowQuickTreeSection) return;
    const id = requestAnimationFrame(() => {
      quickTreeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
    return () => cancelAnimationFrame(id);
  }, [shouldShowQuickTreeSection]);

  if (steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-6 md:p-8"
        >
          <div className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Layers className="w-8 h-8 md:w-10 md:h-10 text-primary" />
          </div>
          <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">No Steps Generated</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Enter an array and click "Generate Steps" to visualize the algorithm step-by-step.
          </p>
        </motion.div>
      </div>
    );
  }

  const hasSteps = steps.length > 0;
  const isAtStart = currentStepIndex === 0;

  // For pictorial mode, show progressive steps up to current
  const getVisibleSteps = () => {
    // Show all steps up to current + a few ahead for context
    const endIndex = Math.min(steps.length, currentStepIndex + 2);
    return steps.slice(0, endIndex).map((step, i) => ({
      step,
      globalIndex: i,
    }));
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-3 md:p-4 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {viewMode === 'pictorial' ? (
              <Layers className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            ) : viewMode === 'bars' ? (
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            ) : (
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-sm md:text-base text-foreground">
              {viewMode === 'pictorial' ? 'Step-by-Step View' : viewMode === 'bars' ? 'Bar Chart View' : 'Focus Mode'}
            </h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {viewMode === 'pictorial'
                ? 'Watch the algorithm progress step-by-step'
                : viewMode === 'bars'
                  ? 'Histogram-style bars with clear indicators'
                  : 'Focus on current step with details'}
            </p>
          </div>
        </div>
        
        {/* Compact controls for mobile */}
        <div className="flex items-center gap-2 lg:hidden">
          <button 
            onClick={prevStep} 
            disabled={isAtStart}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-40"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button 
            onClick={isPlaying ? pause : play} 
            disabled={isAtEnd && !isPlaying}
            className="p-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button 
            onClick={nextStep} 
            disabled={isAtEnd}
            className="p-2 rounded-lg bg-secondary hover:bg-secondary/80 disabled:opacity-40"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        
        <div className="hidden sm:block">
          <Legend />
        </div>
      </div>

      {/* Mobile Legend */}
      <div className="sm:hidden px-3 py-2 border-b border-border">
        <Legend />
      </div>

      {/* Step Progress Indicator */}
      <div className="shrink-0 px-3 md:px-4 py-2 bg-muted/30 border-b border-border">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span className="font-medium">Step {currentStepIndex + 1} of {steps.length}</span>
          <span className="font-mono text-primary">{currentStep?.label}</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-primary to-accent" 
            initial={false}
            animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      </div>

      {/* Visualization Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-3 md:p-4"
      >
        {viewMode === 'pictorial' ? (
          <div ref={listRef} className={`relative flex flex-col gap-2 md:gap-3 ${shouldShowMergeTreeSection ? 'pb-2' : ''}`}>
            {/* Match Focus-mode indicator behavior: absolute overlay that animates position only */}
            {activeIndicator && (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute left-0 right-0 rounded-xl bg-primary/10 border border-primary/25"
                initial={false}
                animate={{ y: activeIndicator.y, height: activeIndicator.height, opacity: 1 }}
                transition={{ type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  boxShadow:
                    '0 0 0 1px hsl(var(--primary) / 0.08) inset, 0 10px 24px -18px hsl(var(--primary) / 0.35)',
                }}
              />
            )}

            {getVisibleSteps().map(({ step, globalIndex }) => {
              const isActiveRow = globalIndex === currentStepIndex;
              return (
                <div
                  key={globalIndex}
                  data-step={globalIndex}
                  className={globalIndex <= currentStepIndex ? 'opacity-100' : 'opacity-40'}
                >
                  <div className="relative">
                    <StepRow
                      step={step}
                      prevStep={globalIndex > 0 ? steps[globalIndex - 1] : undefined}
                      stepNumber={globalIndex + 1}
                      isActive={isActiveRow}
                      isPast={globalIndex < currentStepIndex}
                      stableLayout={true}
                      indicatorMode="pictorial"
                      algorithm={algorithm}
                    />
                  </div>
                </div>
              );
            })}

            {/* Upcoming steps indicator (opacity-only; no layout animation) */}
            {currentStepIndex < steps.length - 1 && (
              <div className="text-center py-4 text-xs text-muted-foreground opacity-50">
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
                  {steps.length - currentStepIndex - 1} more step{steps.length - currentStepIndex - 1 > 1 ? 's' : ''} remaining
                </span>
              </div>
            )}

            {shouldShowMergeTreeSection && (
              <div ref={treeSectionRef} className="mt-3 md:mt-4 pt-3 border-t border-border scroll-mt-24">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Merge Sort Tree</div>
                    <div className="text-[11px] text-muted-foreground">See the split + merge recursion diagram for this run</div>
                  </div>
                  <Button
                    variant={showMergeTree ? 'secondary' : 'default'}
                    onClick={handleShowMergeTree}
                    className="shrink-0"
                  >
                    {showMergeTree ? 'Hide Merge Sort Tree' : 'Show Merge Sort Tree'}
                  </Button>
                </div>

                {showMergeTree && (
                  <div className="mt-3">
                    <MergeSortTreeDiagram root={mergeTreeRoot} />
                  </div>
                )}
              </div>
            )}

            {shouldShowQuickTreeSection && (
              <div ref={quickTreeSectionRef} className="mt-3 md:mt-4 pt-3 border-t border-border scroll-mt-24">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-foreground">Quick Sort Tree</div>
                    <div className="text-[11px] text-muted-foreground">See the partition recursion diagram for this run</div>
                  </div>
                  <Button
                    variant={showQuickTree ? 'secondary' : 'default'}
                    onClick={handleShowQuickTree}
                    className="shrink-0"
                  >
                    {showQuickTree ? 'Hide Quick Sort Tree' : 'Show Quick Sort Tree'}
                  </Button>
                </div>

                {showQuickTree && quickTree && (
                  <div className="mt-3">
                    <QuickSortTreeDiagram
                      root={quickTree.root}
                      sortedValues={quickTree.sortedValues}
                      autoOpenFullscreen={quickAutoOpenFullscreen}
                      onAutoOpenConsumed={() => setQuickAutoOpenFullscreen(false)}
                    />
                  </div>
                )}
              </div>
            )}

          </div>
        ) : viewMode === 'bars' ? (
          <div className="flex flex-col items-center justify-start min-h-full pt-4 md:pt-6">
            <div className="w-full max-w-4xl">
              <div className="text-center mb-4 md:mb-6">
                <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
              </div>

              <BarChartStep
                step={currentStep}
                stepIndex={currentStepIndex}
                playbackSpeedMs={playbackSpeed}
              />

              {shouldShowMergeTreeSection && (
                <div ref={treeSectionRef} className="mt-3 md:mt-4 pt-3 border-t border-border scroll-mt-24">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Merge Sort Tree</div>
                      <div className="text-[11px] text-muted-foreground">See the split + merge recursion diagram for this run</div>
                    </div>
                    <Button
                      variant={showMergeTree ? 'secondary' : 'default'}
                      onClick={handleShowMergeTree}
                      className="shrink-0"
                    >
                      {showMergeTree ? 'Hide Merge Sort Tree' : 'Show Merge Sort Tree'}
                    </Button>
                  </div>

                  {showMergeTree && (
                    <div className="mt-3">
                      <MergeSortTreeDiagram root={mergeTreeRoot} />
                    </div>
                  )}
                </div>
              )}

              {shouldShowQuickTreeSection && (
                <div ref={quickTreeSectionRef} className="mt-3 md:mt-4 pt-3 border-t border-border scroll-mt-24">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Quick Sort Tree</div>
                      <div className="text-[11px] text-muted-foreground">See the partition recursion diagram for this run</div>
                    </div>
                    <Button
                      variant={showQuickTree ? 'secondary' : 'default'}
                      onClick={handleShowQuickTree}
                      className="shrink-0"
                    >
                      {showQuickTree ? 'Hide Quick Sort Tree' : 'Show Quick Sort Tree'}
                    </Button>
                  </div>

                  {showQuickTree && quickTree && (
                    <div className="mt-3">
                      <QuickSortTreeDiagram
                        root={quickTree.root}
                        sortedValues={quickTree.sortedValues}
                        autoOpenFullscreen={quickAutoOpenFullscreen}
                        onAutoOpenConsumed={() => setQuickAutoOpenFullscreen(false)}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-start min-h-full pt-6 md:pt-10">
            {/* Large Step Display */}
            <div className="w-full max-w-3xl">
              <div className="text-center mb-4 md:mb-6">
                <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                  Step {currentStepIndex + 1} of {steps.length}
                </span>
                <h3 className="mt-3 md:mt-4 text-xl md:text-2xl font-bold text-foreground">{currentStep.label}</h3>
              </div>

              <StepRow
                step={currentStep}
                prevStep={currentStepIndex > 0 ? steps[currentStepIndex - 1] : undefined}
                stepNumber={currentStepIndex + 1}
                isActive={true}
                showArrows={true}
                stableLayout={true}
                algorithm={algorithm}
              />

              {/* Explanation */}
              <div className={`rounded-lg bg-primary/5 border border-primary/20 ${shouldShowMergeTreeSection ? 'mt-3 p-3' : 'mt-4 md:mt-6 p-4'}`}>
                <p className="text-sm md:text-base text-foreground leading-relaxed">{currentStep.explanation}</p>
              </div>

              {shouldShowMergeTreeSection && (
                <div ref={treeSectionRef} className="mt-3 md:mt-4 pt-3 border-t border-border scroll-mt-24">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Merge Sort Tree</div>
                      <div className="text-[11px] text-muted-foreground">See the split + merge recursion diagram for this run</div>
                    </div>
                    <Button
                      variant={showMergeTree ? 'secondary' : 'default'}
                      onClick={handleShowMergeTree}
                      className="shrink-0"
                    >
                      {showMergeTree ? 'Hide Merge Sort Tree' : 'Show Merge Sort Tree'}
                    </Button>
                  </div>

                  {showMergeTree && (
                    <div className="mt-3">
                      <MergeSortTreeDiagram root={mergeTreeRoot} />
                    </div>
                  )}
                </div>
              )}

              {shouldShowQuickTreeSection && (
                <div ref={quickTreeSectionRef} className="mt-3 md:mt-4 pt-3 border-t border-border scroll-mt-24">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-foreground">Quick Sort Tree</div>
                      <div className="text-[11px] text-muted-foreground">See the partition recursion diagram for this run</div>
                    </div>
                    <Button
                      variant={showQuickTree ? 'secondary' : 'default'}
                      onClick={handleShowQuickTree}
                      className="shrink-0"
                    >
                      {showQuickTree ? 'Hide Quick Sort Tree' : 'Show Quick Sort Tree'}
                    </Button>
                  </div>

                  {showQuickTree && quickTree && (
                    <div className="mt-3">
                      <QuickSortTreeDiagram
                        root={quickTree.root}
                        sortedValues={quickTree.sortedValues}
                        autoOpenFullscreen={quickAutoOpenFullscreen}
                        onAutoOpenConsumed={() => setQuickAutoOpenFullscreen(false)}
                      />
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};