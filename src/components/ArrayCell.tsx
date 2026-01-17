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
      // Yellow pulsing glow for comparisons
      return {
        scale: [1, 1.1, 1],
        boxShadow: [
          '0 0 0px hsl(45 100% 55% / 0)',
          '0 0 25px hsl(45 100% 55% / 0.8)',
          '0 0 0px hsl(45 100% 55% / 0)'
        ],
      };
    case 'swap':
      // Red shake + flash for swaps
      return {
        x: [0, -4, 4, -4, 4, 0],
        scale: [1, 1.15, 1],
        boxShadow: [
          '0 0 0px hsl(0 85% 60% / 0)',
          '0 0 30px hsl(0 85% 60% / 1)',
          '0 0 15px hsl(0 85% 60% / 0.5)'
        ],
      };
    case 'found':
      // Green celebration bounce for found elements
      return {
        scale: [1, 1.3, 0.95, 1.15, 1],
        rotate: [0, -5, 5, -3, 0],
        boxShadow: [
          '0 0 0px hsl(152 82% 50% / 0)',
          '0 0 40px hsl(152 82% 50% / 1)',
          '0 0 20px hsl(152 82% 50% / 0.7)'
        ],
      };
    case 'eliminated':
      // Gray fade out for eliminated range
      return {
        opacity: [1, 0.3],
        scale: [1, 0.9],
      };
    case 'key':
      // Blue lift effect for key element
      return {
        y: [0, -8, 0],
        scale: [1, 1.1, 1],
        boxShadow: [
          '0 0 0px hsl(217 91% 60% / 0)',
          '0 0 20px hsl(217 91% 60% / 0.8)',
          '0 0 10px hsl(217 91% 60% / 0.5)'
        ],
      };
    case 'pivot':
      // Orange glow for pivot
      return {
        scale: [1, 1.12, 1],
        boxShadow: [
          '0 0 0px hsl(32 95% 55% / 0)',
          '0 0 25px hsl(32 95% 55% / 0.9)',
          '0 0 12px hsl(32 95% 55% / 0.5)'
        ],
      };
    case 'shift':
      // Purple slide effect for shifts
      return {
        x: [0, 6, 0],
        scale: [1, 1.05, 1],
        boxShadow: [
          '0 0 0px hsl(262 80% 60% / 0)',
          '0 0 20px hsl(262 80% 60% / 0.7)',
          '0 0 10px hsl(262 80% 60% / 0.4)'
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

const getTransition = (animType: string): { duration: number; repeat?: number; repeatDelay?: number; ease?: 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' } => {
  switch (animType) {
    case 'compare':
      return { duration: 0.5, repeat: Infinity, repeatDelay: 0.3 };
    case 'swap':
      return { duration: 0.4, ease: 'easeInOut' };
    case 'found':
      return { duration: 0.6, ease: 'easeOut' };
    case 'eliminated':
      return { duration: 0.3 };
    case 'key':
      return { duration: 0.5, repeat: Infinity, repeatDelay: 0.4 };
    case 'pivot':
      return { duration: 0.6, repeat: Infinity, repeatDelay: 0.4 };
    case 'shift':
      return { duration: 0.3, repeat: 2 };
    case 'sorted':
      return { duration: 0.4 };
    default:
      return { duration: 0.3 };
  }
};

export const ArrayCell: React.FC<ArrayCellProps> = ({ value, index, highlights, pointers, layoutId, isSmall = false }) => {
  const cellClass = getCellClass(index, highlights);
  const activePointers = Object.entries(pointers).filter(([_, idx]) => idx === index).map(([name]) => name);
  const animType = getAnimationType(index, highlights);
  const isHighlighted = animType !== 'none';

  return (
    <div className="relative">
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
        layout 
        layoutId={layoutId} 
        className={`array-cell ${cellClass} ${isSmall ? 'w-8 h-8 text-sm' : ''} relative overflow-visible`} 
        animate={getAnimation(animType, isHighlighted)}
        transition={{ 
          layout: { type: 'spring', stiffness: 300, damping: 25 }, 
          ...getTransition(animType)
        }}
      >
        {value}
        
        {/* Visual indicators for specific states */}
        {animType === 'compare' && !isSmall && (
          <motion.div 
            className="absolute inset-0 rounded-lg border-2 border-yellow-400"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.4, repeat: Infinity }}
          />
        )}
        
        {animType === 'swap' && !isSmall && (
          <motion.div 
            className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ duration: 0.3 }}
          >
            <span className="text-[6px] text-white font-bold">↔</span>
          </motion.div>
        )}
        
        {animType === 'found' && !isSmall && (
          <motion.div 
            className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ duration: 0.4 }}
          >
            <span className="text-[8px] text-white font-bold">✓</span>
          </motion.div>
        )}
        
        {animType === 'eliminated' && !isSmall && (
          <motion.div 
            className="absolute inset-0 bg-gray-900/30 rounded-lg flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <span className="text-gray-400 text-lg font-bold">✗</span>
          </motion.div>
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