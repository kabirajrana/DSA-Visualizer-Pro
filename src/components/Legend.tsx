import React from 'react';
import { motion } from 'framer-motion';

const legendItems = [
  { label: 'Compare', color: 'bg-compare', textColor: 'text-compare' },
  { label: 'Swap', color: 'bg-swap', textColor: 'text-swap' },
  { label: 'Key', color: 'bg-key', textColor: 'text-key' },
  { label: 'Sorted', color: 'bg-sorted', textColor: 'text-sorted' },
  { label: 'Found', color: 'bg-found', textColor: 'text-found' },
  { label: 'Shift', color: 'bg-shift', textColor: 'text-shift' },
];

export const Legend: React.FC = () => {
  return (
    <motion.div 
      className="flex flex-wrap gap-4 px-4 py-3 bg-card/50 rounded-lg border border-border"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      {legendItems.map((item, i) => (
        <motion.div
          key={item.label}
          className="flex items-center gap-2"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.05 }}
        >
          <div className={`w-4 h-4 rounded ${item.color} opacity-80`} />
          <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
        </motion.div>
      ))}
    </motion.div>
  );
};
