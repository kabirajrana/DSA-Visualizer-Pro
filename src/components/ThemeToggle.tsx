import React from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.button
          onClick={toggleTheme}
          className="relative p-2.5 rounded-xl bg-secondary hover:bg-secondary/80 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          aria-label="Toggle theme"
        >
          <motion.div
            initial={false}
            animate={{ rotate: theme === 'dark' ? 0 : 180 }}
            transition={{ duration: 0.3 }}
          >
            {theme === 'dark' ? (
              <Moon className="w-5 h-5 text-primary" />
            ) : (
              <Sun className="w-5 h-5 text-primary" />
            )}
          </motion.div>
        </motion.button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Switch to {theme === 'dark' ? 'light' : 'dark'} mode</p>
      </TooltipContent>
    </Tooltip>
  );
};