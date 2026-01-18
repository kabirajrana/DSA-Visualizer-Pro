import React from 'react';
import { motion } from 'framer-motion';
import { MoveArrow as MoveArrowType } from '@/lib/stepTypes';

interface MoveArrowProps {
  arrow: MoveArrowType;
  cellWidth: number;
  cellGap: number;
  fromX?: number;
  toX?: number;
  animateDraw?: boolean;
}

export const MoveArrow: React.FC<MoveArrowProps> = ({
  arrow,
  cellWidth,
  cellGap,
  fromX,
  toX,
  animateDraw = true,
}) => {
  const { fromIndex, toIndex, type } = arrow;

  const startX =
    typeof fromX === 'number'
      ? fromX
      : fromIndex * (cellWidth + cellGap) + cellWidth / 2;
  const endX =
    typeof toX === 'number'
      ? toX
      : toIndex * (cellWidth + cellGap) + cellWidth / 2;
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
      initial={{ opacity: 0, y: 2 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
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
        initial={animateDraw ? { pathLength: 0 } : { opacity: 0 }}
        animate={animateDraw ? { pathLength: 1 } : { opacity: 1 }}
        transition={
          animateDraw
            ? { duration: 0.55, ease: [0.22, 1, 0.36, 1] }
            : { duration: 0.2, ease: [0.22, 1, 0.36, 1] }
        }
      />
    </motion.svg>
  );
};
