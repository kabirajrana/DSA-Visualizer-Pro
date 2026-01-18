import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, BarChart3, Clock, ChevronDown, ChevronUp, Eye, EyeOff } from 'lucide-react';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { ALGORITHMS } from '@/lib/stepTypes';
import { PSEUDOCODE, CODE_LINE_MAPPING } from '@/lib/pseudocode';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

export const DebuggerPanel: React.FC = () => {
  const { algorithm, steps, currentStepIndex } = useDebuggerStore();
  const [isCodeVisible, setIsCodeVisible] = useState(true);

  const currentStep = steps[currentStepIndex];
  const algorithmInfo = ALGORITHMS.find(a => a.id === algorithm);

  const pseudocodeLines = PSEUDOCODE[algorithm];
  const mappedLine = currentStep ? (CODE_LINE_MAPPING[algorithm]?.[currentStep.codeLine] ?? null) : null;
  const activeIndex = mappedLine === null ? -1 : pseudocodeLines.findIndex((l) => l.line === mappedLine);
  const maxLines = 12; // keep the code block height stable across all algorithms
  const lineHeight = 22; // px; matches the fixed row height below

  return (
    <div className="panel h-full flex flex-col overflow-hidden">
      <div className="panel-header">
        <span className="panel-title">Debugger</span>
        <Code2 className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Algorithm Code (Collapsible) */}
        <Collapsible open={isCodeVisible} onOpenChange={setIsCodeVisible}>
          <CollapsibleTrigger className="collapsible-trigger">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Algorithm Code
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isCodeVisible ? (
                <>
                  <EyeOff className="w-3.5 h-3.5 text-muted-foreground" />
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </>
              )}
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="bg-muted/30 border-b border-border">
              {/* Stable step-code view: fixed height, only the indicator moves */}
              <div
                className="relative p-3 font-mono text-[10px] md:text-xs text-foreground/90"
                style={{
                  minHeight: maxLines * lineHeight + 12,
                }}
              >
                {/* Active line indicator (absolute, does not affect layout) */}
                {activeIndex >= 0 && (
                  <motion.div
                    aria-hidden
                    className="absolute left-3 right-3 rounded-md bg-primary/15 border-l-2 border-primary"
                    initial={false}
                    animate={{
                      y: activeIndex * lineHeight,
                      opacity: 1,
                    }}
                    transition={{ type: 'tween', duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                    style={{
                      height: lineHeight,
                      boxShadow: '0 0 0 1px hsl(var(--primary) / 0.10) inset',
                    }}
                  />
                )}

                <div className="relative">
                  {pseudocodeLines.map((line) => {
                    const isActive = line.line === mappedLine;
                    return (
                      <div
                        key={line.line}
                        className="flex items-center"
                        style={{ height: lineHeight }}
                      >
                        <div className="w-7 shrink-0 text-muted-foreground/70 text-right pr-2 select-none">
                          {line.line}
                        </div>
                        <div
                          className={isActive ? 'text-foreground' : 'text-foreground/85'}
                          style={{ paddingLeft: line.indent * 14 }}
                        >
                          {line.code}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Step Explanation - Always Visible & Prominent */}
        <div className="border-b border-border bg-primary/5">
          <div className="px-4 py-2 bg-primary/10 flex items-center gap-2">
            <span className="text-xs font-semibold text-primary uppercase tracking-wider">
              💡 Current Step
            </span>
            {currentStep && (
              <span className="ml-auto text-[10px] font-mono text-muted-foreground">
                {currentStepIndex + 1} / {steps.length}
              </span>
            )}
          </div>
          <div className="p-4">
            <AnimatePresence mode="wait">
              {currentStep ? (
                <motion.div
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="space-y-2"
                >
                  <p className="text-sm font-medium text-primary">{currentStep.label}</p>
                  <p className="text-sm text-foreground leading-relaxed">
                    {currentStep.explanation}
                  </p>
                </motion.div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Click "Generate Steps" to see explanations.
                </p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Variables */}
        {currentStep && Object.keys(currentStep.pointers).length > 0 && (
          <div className="border-b border-border">
            <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Variables</span>
            </div>
            <div className="p-3 grid grid-cols-2 md:grid-cols-3 gap-2">
              <AnimatePresence mode="popLayout">
                {Object.entries(currentStep.pointers).map(([name, value]) => (
                  <motion.div
                    key={name}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="p-2 rounded-lg bg-secondary/50 border border-border"
                  >
                    <span className="text-[10px] text-muted-foreground font-mono">{name}</span>
                    <p className="text-base md:text-lg font-mono font-bold text-primary">
                      {value !== null ? value : '—'}
                    </p>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Metrics */}
        {currentStep && (
          <div className="border-b border-border">
            <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Metrics</span>
            </div>
            <div className="p-3 grid grid-cols-3 gap-1 sm:gap-2">
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 min-w-0">
                <motion.p
                  key={`comp-${currentStep.metrics.comparisons}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-base sm:text-lg md:text-2xl font-mono font-bold text-compare"
                >
                  {currentStep.metrics.comparisons}
                </motion.p>
                <span className="block text-[8px] sm:text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate">
                  Comps
                </span>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-red-500/10 border border-red-500/30 min-w-0">
                <motion.p
                  key={`swap-${currentStep.metrics.swaps}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-base sm:text-lg md:text-2xl font-mono font-bold text-swap"
                >
                  {currentStep.metrics.swaps}
                </motion.p>
                <span className="block text-[8px] sm:text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate">
                  Swaps
                </span>
              </div>
              <div className="text-center p-1.5 sm:p-2 rounded-lg bg-primary/10 border border-primary/30 min-w-0">
                <motion.p
                  key={`pass-${currentStep.metrics.passes}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="text-base sm:text-lg md:text-2xl font-mono font-bold text-primary"
                >
                  {currentStep.metrics.passes}
                </motion.p>
                <span className="block text-[8px] sm:text-[10px] md:text-xs text-muted-foreground uppercase tracking-wider truncate">
                  Passes
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Complexity */}
        {algorithmInfo && (
          <div>
            <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Complexity</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Time (Best)</span>
                <span className="font-mono text-sorted">{algorithmInfo.timeComplexity.best}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Time (Average)</span>
                <span className="font-mono text-compare">{algorithmInfo.timeComplexity.average}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Time (Worst)</span>
                <span className="font-mono text-swap">{algorithmInfo.timeComplexity.worst}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Space</span>
                <span className="font-mono text-primary">{algorithmInfo.spaceComplexity}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};