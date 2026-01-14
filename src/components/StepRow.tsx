import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Step } from '@/lib/stepTypes';
import { ArrayCell } from './ArrayCell';
import { MoveArrow } from './MoveArrow';

interface StepRowProps {
  step: Step;
  stepNumber: number;
  isActive: boolean;
  showArrows?: boolean;
}

const CELL_WIDTH = 48;
const CELL_GAP = 8;

export const StepRow: React.FC<StepRowProps> = ({ step, stepNumber, isActive, showArrows = true }) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -20 }}
      animate={{ 
        opacity: isActive ? 1 : 0.5, 
        x: 0,
        scale: isActive ? 1 : 0.95,
      }}
      exit={{ opacity: 0, x: 20 }}
      className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
        isActive ? 'bg-card border border-primary/30' : 'bg-card/30 border border-transparent'
      }`}
    >
      {/* Step Label */}
      <div className="w-28 shrink-0">
        <span className={`text-xs font-mono ${isActive ? 'text-primary' : 'text-muted-foreground'}`}>
          Step {stepNumber}
        </span>
        <p className={`text-sm font-medium truncate ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
          {step.label}
        </p>
      </div>

      {/* Before Array */}
      <div className="relative flex items-center gap-2 pb-6">
        <AnimatePresence mode="popLayout">
          {step.before.map((value, index) => (
            <ArrayCell
              key={`before-${stepNumber}-${index}`}
              value={value}
              index={index}
              highlights={step.highlights.before}
              pointers={step.pointers}
              layoutId={isActive ? `cell-before-${index}` : undefined}
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
        className="text-muted-foreground"
      >
        <ArrowRight className="w-5 h-5" />
      </motion.div>

      {/* After Array */}
      <div className="relative flex items-center gap-2 pb-6">
        <AnimatePresence mode="popLayout">
          {step.after.map((value, index) => (
            <ArrayCell
              key={`after-${stepNumber}-${index}`}
              value={value}
              index={index}
              highlights={step.highlights.after}
              pointers={{}}
              layoutId={isActive ? `cell-after-${index}` : undefined}
            />
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};
