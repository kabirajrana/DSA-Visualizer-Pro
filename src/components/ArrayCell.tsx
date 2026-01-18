import React from 'react';
import { motion } from 'framer-motion';
import { Highlights } from '@/lib/stepTypes';

interface ArrayCellProps {
  value: number;
  index: number;
  highlights: Highlights;
  pointers: Record<string, number | null>;
  layoutId?: string;
  enableLayout?: boolean;
  isSmall?: boolean;
  dimmed?: boolean;
  cellRef?: React.Ref<HTMLDivElement>;
}

// Get animation type based on highlight state
const getAnimationType = (index: number, highlights: Highlights): 'compare' | 'swap' | 'found' | 'eliminated' | 'sorted' | 'key' | 'pivot' | 'shift' | 'none' => {
  if (highlights.found.includes(index)) return 'found';
  if (highlights.swap.includes(index)) return 'swap';
  if (highlights.pivot?.includes(index)) return 'pivot';
  if (highlights.key.includes(index)) return 'key';
  if (highlights.compare.includes(index)) return 'compare';
  if (highlights.shift.includes(index)) return 'shift';
  if (highlights.eliminated?.includes(index)) return 'eliminated';
  if (highlights.sorted.includes(index)) return 'sorted';
  return 'none';
};

const getCellClass = (index: number, highlights: Highlights): string => {
  const type = getAnimationType(index, highlights);
  const classMap: Record<string, string> = {
    found: 'array-cell-found',
    swap: 'array-cell-swap',
    pivot: 'array-cell-pivot',
    key: 'array-cell-key',
    compare: 'array-cell-compare',
    shift: 'array-cell-shift',
    eliminated: 'array-cell-eliminated',
    sorted: 'array-cell-sorted',
    none: 'array-cell-default',
  };
  return classMap[type];
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

// Animation configurations based on action type
const getAnimation = (animType: string, isActive: boolean) => {
  if (!isActive) return {};
  
  switch (animType) {
    case 'compare':
      // Gentle emphasis for comparisons (no constant pulsing)
      return {
        scale: [1, 1.03, 1],
        boxShadow: [
          '0 0 0px hsl(45 100% 55% / 0)',
          '0 0 14px hsl(45 100% 55% / 0.35)',
          '0 0 0px hsl(45 100% 55% / 0)'
        ],
      };
    case 'swap':
      // Smooth swap emphasis (reduced shake)
      return {
        x: [0, -2, 2, 0],
        scale: [1, 1.06, 1],
        boxShadow: [
          '0 0 0px hsl(0 85% 60% / 0)',
          '0 0 16px hsl(0 85% 60% / 0.55)',
          '0 0 10px hsl(0 85% 60% / 0.25)'
        ],
      };
    case 'found':
      // Clear success emphasis (no rotation)
      return {
        scale: [1, 1.08, 1],
        boxShadow: [
          '0 0 0px hsl(152 82% 50% / 0)',
          '0 0 18px hsl(152 82% 50% / 0.55)',
          '0 0 10px hsl(152 82% 50% / 0.25)'
        ],
      };
    case 'eliminated':
      // Gray fade out for eliminated range
      return {
        opacity: [1, 0.3],
        scale: [1, 0.9],
      };
    case 'key':
      // Subtle lift for key element (single motion)
      return {
        y: [0, -4, 0],
        scale: [1, 1.04, 1],
        boxShadow: [
          '0 0 0px hsl(217 91% 60% / 0)',
          '0 0 14px hsl(217 91% 60% / 0.35)',
          '0 0 8px hsl(217 91% 60% / 0.2)'
        ],
      };
    case 'pivot':
      // Subtle glow for pivot (single motion)
      return {
        scale: [1, 1.04, 1],
        boxShadow: [
          '0 0 0px hsl(32 95% 55% / 0)',
          '0 0 14px hsl(32 95% 55% / 0.4)',
          '0 0 8px hsl(32 95% 55% / 0.2)'
        ],
      };
    case 'shift':
      // Small nudge for shifts
      return {
        x: [0, 3, 0],
        scale: [1, 1.02, 1],
        boxShadow: [
          '0 0 0px hsl(262 80% 60% / 0)',
          '0 0 14px hsl(262 80% 60% / 0.3)',
          '0 0 8px hsl(262 80% 60% / 0.15)'
        ],
      };
    case 'sorted':
      // Subtle green glow for sorted
      return {
        boxShadow: [
          '0 0 0px hsl(152 76% 45% / 0)',
          '0 0 12px hsl(152 76% 45% / 0.5)',
        ],
      };
    default:
      return {};
  }
};

const getTransition = (
  animType: string,
  slowMotion: boolean,
): { duration: number; repeat?: number; repeatDelay?: number; ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' } => {
  const slow = (d: number) => (slowMotion ? Math.round(d * 1.8 * 100) / 100 : d);
  switch (animType) {
    case 'compare':
      return { duration: slow(0.28), ease: 'easeOut' };
    case 'swap':
      return { duration: slow(0.32), ease: 'easeInOut' };
    case 'found':
      return { duration: slow(0.35), ease: 'easeOut' };
    case 'eliminated':
      return { duration: slow(0.3) };
    case 'key':
      return { duration: slow(0.32), ease: 'easeOut' };
    case 'pivot':
      return { duration: slow(0.32), ease: 'easeOut' };
    case 'shift':
      return { duration: slow(0.24), ease: 'easeInOut' };
    case 'sorted':
      return { duration: slow(0.4) };
    default:
      return { duration: slow(0.3) };
  }
};

export const ArrayCell: React.FC<ArrayCellProps> = ({
  value,
  index,
  highlights,
  pointers,
  layoutId,
  enableLayout = true,
  isSmall = false,
  dimmed = false,
  cellRef,
}) => {
  const cellClass = getCellClass(index, highlights);
  const activePointers = Object.entries(pointers)
    .filter(([_, idx]) => idx === index)
    .map(([name]) => (name === 'minIdx' ? 'minIndex' : name));
  const animType = getAnimationType(index, highlights);
  const isHighlighted = animType !== 'none';
  const slowMotion = !enableLayout;

  return (
    <div ref={cellRef} className="relative" data-cell-index={index}>
      {/* Pointer labels - fixed positioning for mobile stability */}
      {activePointers.length > 0 && !isSmall && (
        <div 
          className="absolute -top-6 md:-top-8 left-1/2 -translate-x-1/2 flex gap-0.5 z-10"
          style={{ transform: 'translateX(-50%)', willChange: 'auto' }}
        >
          {activePointers.map((name) => (
            <span 
              key={name} 
              className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-mono font-bold shadow-lg ${getPointerColor(name)}`}
            >
              {name}
            </span>
          ))}
        </div>
      )}
      
      {/* Cell with enhanced animations */}
      <motion.div 
        layout={enableLayout}
        layoutId={layoutId} 
        className={`array-cell ${cellClass} ${isSmall ? 'w-8 h-8 text-sm' : ''} relative overflow-visible`} 
        style={dimmed ? { opacity: 0.25, filter: 'saturate(0.8)' } : undefined}
        animate={getAnimation(animType, isHighlighted)}
        transition={{ 
          ...(enableLayout ? { layout: { type: 'spring', stiffness: 300, damping: 25 } } : null),
          ...getTransition(animType, slowMotion),
        }}
      >
        {value}
        
        {/* Visual indicators for specific states */}
        {animType === 'compare' && !isSmall && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-yellow-400/70"
            initial={{ opacity: 0.35 }}
            animate={{ opacity: 0.85 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
          />
        )}
      </motion.div>
      
      {/* Index label */}
      {!isSmall && (
        <div className="absolute -bottom-4 md:-bottom-5 left-1/2 -translate-x-1/2 text-[8px] md:text-[10px] font-mono text-muted-foreground">
          {index}
        </div>
      )}
    </div>
  );
};