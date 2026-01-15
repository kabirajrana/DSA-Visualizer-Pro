import React from 'react';
import { motion } from 'framer-motion';
import { Highlights } from '@/lib/stepTypes';

interface ArrayCellProps {
  value: number;
  index: number;
  highlights: Highlights;
  pointers: Record<string, number | null>;
  layoutId?: string;
  isSmall?: boolean;
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
    key: 'bg-blue-500 text-white',
    low: 'bg-green-500 text-white',
    high: 'bg-red-500 text-white',
    mid: 'bg-yellow-500 text-black',
    pivot: 'bg-orange-500 text-white',
    result: 'bg-green-500 text-white',
    target: 'bg-purple-500 text-white',
    minIdx: 'bg-blue-500 text-white',
    pos: 'bg-yellow-500 text-black',
    curr: 'bg-blue-500 text-white',
    prev: 'bg-muted text-muted-foreground',
    left: 'bg-blue-500 text-white',
    right: 'bg-purple-500 text-white',
    parent: 'bg-accent text-accent-foreground',
    child: 'bg-red-500 text-white',
    max: 'bg-orange-500 text-white',
    end: 'bg-muted text-muted-foreground',
    start: 'bg-green-500 text-white',
  };
  return colors[name] || 'bg-muted text-muted-foreground';
};

export const ArrayCell: React.FC<ArrayCellProps> = ({ value, index, highlights, pointers, layoutId, isSmall = false }) => {
  const cellClass = getCellClass(index, highlights);
  const activePointers = Object.entries(pointers).filter(([_, idx]) => idx === index).map(([name]) => name);
  const shouldPulse = highlights.compare.includes(index) || highlights.found.includes(index);

  return (
    <div className="relative">
      {activePointers.length > 0 && !isSmall && (
        <motion.div className="absolute -top-7 md:-top-9 left-1/2 -translate-x-1/2 flex gap-0.5" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}>
          {activePointers.map((name) => (
            <motion.span key={name} className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-mono font-bold shadow-lg ${getPointerColor(name)}`} layoutId={layoutId ? `pointer-${name}-${layoutId}` : undefined}>
              {name}
            </motion.span>
          ))}
        </motion.div>
      )}
      <motion.div 
        layout 
        layoutId={layoutId} 
        className={`array-cell ${cellClass} ${isSmall ? 'w-8 h-8 text-sm' : ''}`} 
        animate={shouldPulse ? { scale: [1, 1.08, 1] } : {}} 
        transition={{ layout: { type: 'spring', stiffness: 300, damping: 25 }, scale: { duration: 0.4, repeat: shouldPulse ? Infinity : 0, repeatDelay: 0.6 } }}
      >
        {value}
      </motion.div>
      {!isSmall && (
        <div className="absolute -bottom-4 md:-bottom-5 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] font-mono text-muted-foreground">{index}</div>
      )}
    </div>
  );
};