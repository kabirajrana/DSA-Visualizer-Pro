import React from 'react';
import { motion } from 'framer-motion';
import { useDebuggerStore } from '@/store/useDebuggerStore';

const sortingLegend = [
  { label: 'Compare', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { label: 'Swap', color: 'bg-red-500', textColor: 'text-red-500' },
  { label: 'Key', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { label: 'Sorted', color: 'bg-green-500', textColor: 'text-green-500' },
  { label: 'Pivot', color: 'bg-orange-500', textColor: 'text-orange-500' },
];

const searchingLegend = [
  { label: 'Compare', color: 'bg-yellow-500', textColor: 'text-yellow-500' },
  { label: 'Found', color: 'bg-green-500', textColor: 'text-green-500' },
  { label: 'Low/High', color: 'bg-blue-500', textColor: 'text-blue-500' },
  { label: 'Eliminated', color: 'bg-gray-500', textColor: 'text-gray-400' },
];

export const Legend: React.FC = () => {
  const { category } = useDebuggerStore();
  const legendItems = category === 'sorting' ? sortingLegend : searchingLegend;

  return (
    <motion.div 
      className="flex flex-wrap gap-2 md:gap-4 px-3 py-2 md:px-4 md:py-3 bg-card/50 rounded-lg border border-border"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {legendItems.map((item, i) => (
        <motion.div
          key={item.label}
          className="flex items-center gap-1.5 md:gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className={`w-3 h-3 md:w-4 md:h-4 rounded ${item.color} opacity-80`} />
          <span className={`text-[10px] md:text-xs font-medium ${item.textColor}`}>{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};