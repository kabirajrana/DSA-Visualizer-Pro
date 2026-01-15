import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { StepRow } from './StepRow';
import { Legend } from './Legend';
import { Eye, Layers, Play, Pause, SkipForward, SkipBack } from 'lucide-react';

export const PictorialVisualizer: React.FC = () => {
  const { 
    steps, 
    currentStepIndex, 
    viewMode, 
    isPlaying, 
    playbackSpeed, 
    nextStep,
    prevStep,
    play,
    pause,
    reset
  } = useDebuggerStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [animatingStepIndex, setAnimatingStepIndex] = useState(0);

  // Auto-play effect
  useEffect(() => {
    if (!isPlaying) return;

    const timer = setInterval(() => {
      nextStep();
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, playbackSpeed, nextStep]);

  // Sync animating step with current step
  useEffect(() => {
    setAnimatingStepIndex(currentStepIndex);
  }, [currentStepIndex]);

  // Auto-scroll to current step in pictorial mode
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

  const currentStep = steps[currentStepIndex];
  const hasSteps = steps.length > 0;
  const isAtStart = currentStepIndex === 0;
  const isAtEnd = currentStepIndex === steps.length - 1;

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
            ) : (
              <Eye className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            )}
          </div>
          <div>
            <h2 className="font-semibold text-sm md:text-base text-foreground">
              {viewMode === 'pictorial' ? 'Step-by-Step View' : 'Focus Mode'}
            </h2>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {viewMode === 'pictorial' 
                ? 'Watch the algorithm progress step-by-step' 
                : 'Focus on current step with details'
              }
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
        <AnimatePresence mode="popLayout">
          {viewMode === 'pictorial' ? (
            <motion.div className="space-y-2 md:space-y-3">
              {getVisibleSteps().map(({ step, globalIndex }) => (
                <motion.div 
                  key={globalIndex} 
                  data-step={globalIndex}
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ 
                    opacity: globalIndex <= currentStepIndex ? 1 : 0.3,
                    y: 0,
                    scale: globalIndex === currentStepIndex ? 1 : 0.98
                  }}
                  transition={{ 
                    duration: 0.4,
                    delay: globalIndex === currentStepIndex ? 0.1 : 0
                  }}
                >
                  <StepRow
                    step={step}
                    stepNumber={globalIndex + 1}
                    isActive={globalIndex === currentStepIndex}
                    isPast={globalIndex < currentStepIndex}
                  />
                </motion.div>
              ))}
              
              {/* Upcoming steps indicator */}
              {currentStepIndex < steps.length - 1 && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.5 }}
                  className="text-center py-4 text-xs text-muted-foreground"
                >
                  <span className="inline-flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-pulse" />
                    {steps.length - currentStepIndex - 1} more step{steps.length - currentStepIndex - 1 > 1 ? 's' : ''} remaining
                  </span>
                </motion.div>
              )}
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
                  className="text-center mb-4 md:mb-6"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 text-primary text-xs md:text-sm font-medium">
                    Step {currentStepIndex + 1} of {steps.length}
                  </span>
                  <h3 className="mt-3 md:mt-4 text-xl md:text-2xl font-bold text-foreground">{currentStep.label}</h3>
                </motion.div>

                <StepRow
                  step={currentStep}
                  stepNumber={currentStepIndex + 1}
                  isActive={true}
                  showArrows={true}
                />

                {/* Explanation */}
                <motion.div
                  className="mt-4 md:mt-6 p-4 rounded-lg bg-primary/5 border border-primary/20"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <p className="text-sm md:text-base text-foreground leading-relaxed">{currentStep.explanation}</p>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};