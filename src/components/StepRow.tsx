import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { Step } from '@/lib/stepTypes';
import { ArrayCell } from './ArrayCell';
import { MoveArrow } from './MoveArrow';

interface StepRowProps {
  step: Step;
  stepNumber: number;
  isActive: boolean;
  isPast?: boolean;
  showArrows?: boolean;
}

const CELL_WIDTH = 36;
const CELL_GAP = 4;

export const StepRow: React.FC<StepRowProps> = ({ step, stepNumber, isActive, isPast = false, showArrows = true }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isActive ? 1 : isPast ? 0.7 : 0.4, 
        x: 0,
        scale: isActive ? 1 : 0.97,
      }}
      exit={{ opacity: 0, x: 20 }}
      className={`relative p-2 md:p-3 rounded-lg transition-all ${
        isActive 
          ? 'bg-card border-2 border-primary/40 shadow-lg' 
          : isPast 
            ? 'bg-card/60 border border-sorted/30' 
            : 'bg-card/30 border border-transparent'
      }`}
    >
      {/* Step header - always visible, no horizontal scroll */}
      <div className="flex items-center gap-2 mb-2">
        {/* Step number badge */}
        <div className={`shrink-0 w-7 h-7 md:w-8 md:h-8 rounded-full flex items-center justify-center text-[10px] md:text-xs font-bold ${
          isActive 
            ? 'bg-primary text-primary-foreground' 
            : isPast 
              ? 'bg-sorted/20 text-sorted border border-sorted/40' 
              : 'bg-secondary text-muted-foreground'
        }`}>
          {isPast ? <Check className="w-3 h-3" /> : stepNumber}
        </div>
        
        {/* Step info - compact layout */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className={`text-[10px] font-mono ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
              S{stepNumber}
            </span>
            {step.metrics.passes > 0 && (
              <span className={`text-[9px] px-1 py-0.5 rounded font-medium ${
                isActive ? 'bg-accent/20 text-accent' : 'bg-muted text-muted-foreground'
              }`}>
                P{step.metrics.passes}
              </span>
            )}
          </div>
          <p className={`text-[11px] md:text-xs font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {step.label}
          </p>
        </div>
      </div>

      {/* Arrays - responsive with wrapping, NO horizontal scroll */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Before Array */}
        <div className="relative flex items-center gap-0.5 md:gap-1 pb-4 md:pb-5">
          <AnimatePresence mode="popLayout">
            {step.before.map((value, index) => (
              <ArrayCell
                key={`before-${stepNumber}-${index}`}
                value={value}
                index={index}
                highlights={step.highlights.before}
                pointers={step.pointers}
                layoutId={isActive ? `cell-before-${index}` : undefined}
                isSmall={!isActive}
              />
            ))}
          </AnimatePresence>
          
          {/* Move Arrows */}
          {isActive && showArrows && step.moveArrows.length > 0 && (
            <AnimatePresence>
              {step.moveArrows.map((arrow, i) => (
                <MoveArrow
                  key={`arrow-${i}`}
                  arrow={arrow}
                  cellWidth={CELL_WIDTH}
                  cellGap={CELL_GAP}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Arrow */}
        <motion.div
          animate={{ opacity: isActive ? 1 : 0.3 }}
          className="text-muted-foreground shrink-0"
        >
          <ArrowRight className="w-3 h-3 md:w-4 md:h-4" />
        </motion.div>

        {/* After Array */}
        <div className="relative flex items-center gap-0.5 md:gap-1 pb-4 md:pb-5">
          <AnimatePresence mode="popLayout">
            {step.after.map((value, index) => (
              <ArrayCell
                key={`after-${stepNumber}-${index}`}
                value={value}
                index={index}
                highlights={step.highlights.after}
                pointers={{}}
                layoutId={isActive ? `cell-after-${index}` : undefined}
                isSmall={!isActive}
              />
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Explanation moved to Focus mode card - no duplicate here */}
    </motion.div>
  );
};