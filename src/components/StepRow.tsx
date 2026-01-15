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

const CELL_WIDTH = 40;
const CELL_GAP = 6;

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
      className={`relative flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-4 p-3 md:p-4 rounded-lg transition-all ${
        isActive 
          ? 'bg-card border-2 border-primary/40 shadow-lg' 
          : isPast 
            ? 'bg-card/60 border border-sorted/30' 
            : 'bg-card/30 border border-transparent'
      }`}
    >
      {/* Step indicator */}
      <div className="flex items-center gap-3 w-full md:w-auto">
        <div className={`shrink-0 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-xs md:text-sm font-bold ${
          isActive 
            ? 'bg-primary text-primary-foreground' 
            : isPast 
              ? 'bg-sorted/20 text-sorted border border-sorted/40' 
              : 'bg-secondary text-muted-foreground'
        }`}>
          {isPast ? <Check className="w-4 h-4" /> : stepNumber}
        </div>
        
        <div className="flex-1 md:w-24 md:flex-initial">
          <span className={`text-[10px] md:text-xs font-mono ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
            Step {stepNumber}
          </span>
          <p className={`text-xs md:text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
            {step.label}
          </p>
        </div>
      </div>

      {/* Arrays container */}
      <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-4 w-full md:w-auto overflow-x-auto scrollbar-thin pb-2">
        {/* Before Array */}
        <div className="relative flex items-center gap-1 md:gap-2 pb-5 md:pb-6 shrink-0">
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
          <ArrowRight className="w-4 h-4 md:w-5 md:h-5" />
        </motion.div>

        {/* After Array */}
        <div className="relative flex items-center gap-1 md:gap-2 pb-5 md:pb-6 shrink-0">
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

      {/* Compact explanation for non-active past steps */}
      {isPast && !isActive && (
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          className="text-[10px] md:text-xs text-muted-foreground italic md:ml-auto md:max-w-[200px] truncate"
        >
          {step.explanation.slice(0, 50)}...
        </motion.p>
      )}
    </motion.div>
  );
};