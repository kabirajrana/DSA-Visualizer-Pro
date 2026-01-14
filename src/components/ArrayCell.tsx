import React from 'react';
import { motion } from 'framer-motion';
import { Highlights } from '@/lib/stepTypes';

interface ArrayCellProps {
  value: number;
  index: number;
  highlights: Highlights;
  pointers: Record<string, number | null>;
  layoutId?: string;
}

const getCellClass = (index: number, highlights: Highlights): string => {
  if (highlights.found.includes(index)) return 'array-cell-found';
  if (highlights.swap.includes(index)) return 'array-cell-swap';
  if (highlights.pivot?.includes(index)) return 'array-cell-pivot';
  if (highlights.key.includes(index)) return 'array-cell-key';
  if (highlights.compare.includes(index)) return 'array-cell-compare';
  if (highlights.shift.includes(index)) return 'array-cell-shift';
  if (highlights.eliminated?.includes(index)) return 'array-cell-eliminated';
  if (highlights.sorted.includes(index)) return 'array-cell-sorted';
  return 'array-cell-default';
};

const getPointerColor = (name: string): string => {
  const colors: Record<string, string> = {
    i: 'bg-primary text-primary-foreground',
    j: 'bg-accent text-accent-foreground',
    key: 'bg-key text-primary-foreground',
    low: 'bg-sorted text-primary-foreground',
    high: 'bg-swap text-primary-foreground',
    mid: 'bg-compare text-primary-foreground',
    pivot: 'bg-pivot text-primary-foreground',
    result: 'bg-found text-primary-foreground',
    target: 'bg-shift text-primary-foreground',
    minIdx: 'bg-key text-primary-foreground',
    pos: 'bg-compare text-primary-foreground',
    curr: 'bg-key text-primary-foreground',
    prev: 'bg-muted text-muted-foreground',
    left: 'bg-key text-primary-foreground',
    right: 'bg-shift text-primary-foreground',
    parent: 'bg-accent text-accent-foreground',
    child: 'bg-swap text-primary-foreground',
    max: 'bg-pivot text-primary-foreground',
    end: 'bg-muted text-muted-foreground',
    start: 'bg-sorted text-primary-foreground',
  };
  return colors[name] || 'bg-muted text-muted-foreground';
};

export const ArrayCell: React.FC<ArrayCellProps> = ({ value, index, highlights, pointers, layoutId }) => {
  const cellClass = getCellClass(index, highlights);
  const activePointers = Object.entries(pointers).filter(([_, idx]) => idx === index).map(([name]) => name);
  const shouldPulse = highlights.compare.includes(index) || highlights.found.includes(index);

  return (
    <div className="relative">
      {activePointers.length > 0 && (
        <motion.div className="absolute -top-9 left-1/2 -translate-x-1/2 flex gap-1" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
          {activePointers.map((name) => (
            <motion.span key={name} className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shadow-lg ${getPointerColor(name)}`} layoutId={layoutId ? `pointer-${name}-${layoutId}` : undefined}>
              {name}
            </motion.span>
          ))}
        </motion.div>
      )}
      <motion.div layout layoutId={layoutId} className={`array-cell ${cellClass}`} animate={shouldPulse ? { scale: [1, 1.08, 1] } : {}} transition={{ layout: { type: 'spring', stiffness: 300, damping: 25 }, scale: { duration: 0.4, repeat: shouldPulse ? Infinity : 0, repeatDelay: 0.6 } }}>
        {value}
      </motion.div>
      <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] font-mono text-muted-foreground">{index}</div>
    </div>
  );
};
