import React from 'react';
import { motion } from 'framer-motion';
import { MoveArrow as MoveArrowType } from '@/lib/stepTypes';

interface MoveArrowProps {
  arrow: MoveArrowType;
  cellWidth: number;
  cellGap: number;
}

export const MoveArrow: React.FC<MoveArrowProps> = ({ arrow, cellWidth, cellGap }) => {
  const { fromIndex, toIndex, type } = arrow;
  
  const startX = fromIndex * (cellWidth + cellGap) + cellWidth / 2;
  const endX = toIndex * (cellWidth + cellGap) + cellWidth / 2;
  const midX = (startX + endX) / 2;
  const distance = Math.abs(endX - startX);
  const curveHeight = Math.min(30 + distance * 0.1, 50);

  const pathD = `M ${startX} 0 Q ${midX} ${curveHeight} ${endX} 0`;

  const colors: Record<string, string> = {
    swap: 'hsl(var(--swap))',
    shift: 'hsl(var(--key))',
    compare: 'hsl(var(--compare))',
  };

  return (
    <motion.svg
      className="absolute top-full left-0 w-full h-16 pointer-events-none overflow-visible"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <defs>
        <marker
          id={`arrowhead-${type}`}
          markerWidth="8"
          markerHeight="8"
          refX="6"
          refY="4"
          orient="auto"
        >
          <path
            d="M 0 0 L 8 4 L 0 8 z"
            fill={colors[type]}
          />
        </marker>
      </defs>
      
      <motion.path
        d={pathD}
        fill="none"
        stroke={colors[type]}
        strokeWidth="2"
        strokeLinecap="round"
        markerEnd={`url(#arrowhead-${type})`}
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </motion.svg>
  );
};
