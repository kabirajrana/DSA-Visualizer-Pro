import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { StepRow } from './StepRow';
import { Legend } from './Legend';
import { Eye, Layers } from 'lucide-react';

export const PictorialVisualizer: React.FC = () => {
  const { steps, currentStepIndex, viewMode, isPlaying, playbackSpeed, nextStep } = useDebuggerStore();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      nextStep();
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, nextStep]);

  // Auto-scroll to current step
  useEffect(() => {
    if (viewMode === 'pictorial' && containerRef.current) {
      const activeRow = containerRef.current.querySelector(`[data-step="${currentStepIndex}"]`);
      if (activeRow) {
        activeRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentStepIndex, viewMode]);

  if (steps.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center p-8"
        >
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Layers className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Steps Generated</h3>
          <p className="text-muted-foreground max-w-sm">
            Enter an array and click "Generate Steps" to visualize the algorithm step-by-step.
          </p>
        </motion.div>
      </div>
    );
  }

  const currentStep = steps[currentStepIndex];

  // Calculate visible steps for pictorial mode (show up to 6 steps around current)
  const getVisibleSteps = () => {
    const windowSize = 6;
    const start = Math.max(0, currentStepIndex - Math.floor(windowSize / 2));
    const end = Math.min(steps.length, start + windowSize);
    return steps.slice(start, end).map((step, i) => ({
      step,
      globalIndex: start + i,
    }));
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            {viewMode === 'pictorial' ? (
              <Layers className="w-5 h-5 text-primary" />
            ) : (
              <Eye className="w-5 h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">
              {viewMode === 'pictorial' ? 'Pictorial Rows' : 'Focus Mode'}
            </h2>
            <p className="text-xs text-muted-foreground">
              {viewMode === 'pictorial' 
                ? 'See multiple steps at once' 
                : 'Focus on current step'
              }
            </p>
          </div>
        </div>
        <Legend />
      </div>

      {/* Visualization Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto scrollbar-thin p-4"
      >
        <AnimatePresence mode="popLayout">
          {viewMode === 'pictorial' ? (
            <motion.div className="space-y-3">
              {getVisibleSteps().map(({ step, globalIndex }) => (
                <div key={globalIndex} data-step={globalIndex}>
                  <StepRow
                    step={step}
                    stepNumber={globalIndex + 1}
                    isActive={globalIndex === currentStepIndex}
                  />
                </div>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key={currentStepIndex}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center justify-center min-h-full"
            >
              {/* Large Step Display */}
              <div className="w-full max-w-3xl">
                <motion.div
                  className="text-center mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  <h3 className="mt-4 text-2xl font-bold text-foreground">{currentStep.label}</h3>
                </motion.div>

                <StepRow
                  step={currentStep}
                  stepNumber={currentStepIndex + 1}
                  isActive={true}
                  showArrows={true}
                />

                {/* Explanation */}
                <motion.div
                  className="mt-6 p-4 rounded-lg bg-card/50 border border-border"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-foreground leading-relaxed">{currentStep.explanation}</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
