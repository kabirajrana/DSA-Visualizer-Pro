import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code2, Info, BarChart3, Clock } from 'lucide-react';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { PSEUDOCODE, CODE_LINE_MAPPING } from '@/lib/pseudocode';
import { ALGORITHMS } from '@/lib/stepTypes';

export const DebuggerPanel: React.FC = () => {
  const { algorithm, steps, currentStepIndex } = useDebuggerStore();

  const currentStep = steps[currentStepIndex];
  const pseudocode = PSEUDOCODE[algorithm];
  const algorithmInfo = ALGORITHMS.find(a => a.id === algorithm);
  const activeLine = currentStep ? CODE_LINE_MAPPING[algorithm][currentStep.codeLine] ?? -1 : -1;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-title">Debugger</span>
        <Code2 className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {/* Pseudocode */}
        <div className="border-b border-border">
          <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
            <Code2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Pseudocode</span>
          </div>
          <div className="py-2 font-mono text-sm bg-background/50">
            {pseudocode.map((line) => (
              <motion.div
                key={line.line}
                className={`code-line ${activeLine === line.line ? 'code-line-active' : ''}`}
                style={{ paddingLeft: `${1 + line.indent * 1.5}rem` }}
                animate={{
                  backgroundColor: activeLine === line.line ? 'hsl(var(--primary) / 0.15)' : 'transparent',
                }}
              >
                <span className="text-muted-foreground mr-3 select-none w-4 inline-block">
                  {line.line + 1}
                </span>
                <span className={activeLine === line.line ? 'text-primary' : 'text-foreground'}>
                  {line.code}
                </span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Step Explanation */}
        <div className="border-b border-border">
          <div className="px-4 py-2 bg-muted/30 flex items-center gap-2">
            <Info className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Explanation</span>
          </div>
          <div className="p-4">
            <AnimatePresence mode="wait">
              {currentStep ? (
                <motion.p
                  key={currentStepIndex}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className="text-sm text-foreground leading-relaxed"
                >
                  {currentStep.explanation}
                </motion.p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Generate steps to see explanations.
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
            <div className="p-4 grid grid-cols-3 gap-3">
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
                    <span className="text-xs text-muted-foreground font-mono">{name}</span>
                    <p className="text-lg font-mono font-bold text-primary">
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
            <div className="p-4 grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg bg-compare/10 border border-compare/30">
                <motion.p
                  key={`comp-${currentStep.metrics.comparisons}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="metric-value text-compare"
                >
                  {currentStep.metrics.comparisons}
                </motion.p>
                <span className="metric-label">Comparisons</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-swap/10 border border-swap/30">
                <motion.p
                  key={`swap-${currentStep.metrics.swaps}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="metric-value text-swap"
                >
                  {currentStep.metrics.swaps}
                </motion.p>
                <span className="metric-label">Swaps</span>
              </div>
              <div className="text-center p-3 rounded-lg bg-primary/10 border border-primary/30">
                <motion.p
                  key={`pass-${currentStep.metrics.passes}`}
                  initial={{ scale: 1.2 }}
                  animate={{ scale: 1 }}
                  className="metric-value"
                >
                  {currentStep.metrics.passes}
                </motion.p>
                <span className="metric-label">Passes</span>
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
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Time (Best)</span>
                <span className="font-mono text-sm text-sorted">{algorithmInfo.timeComplexity.best}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Time (Average)</span>
                <span className="font-mono text-sm text-compare">{algorithmInfo.timeComplexity.average}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Time (Worst)</span>
                <span className="font-mono text-sm text-swap">{algorithmInfo.timeComplexity.worst}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Space</span>
                <span className="font-mono text-sm text-primary">{algorithmInfo.spaceComplexity}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
