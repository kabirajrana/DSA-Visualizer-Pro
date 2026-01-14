import React from 'react';
import { motion } from 'framer-motion';
import { Bug, Github, BookOpen } from 'lucide-react';
import { Controls } from '@/components/Controls';
import { PictorialVisualizer } from '@/components/PictorialVisualizer';
import { DebuggerPanel } from '@/components/DebuggerPanel';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-14 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
              <Bug className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-foreground">DSA Debugger</h1>
              <p className="text-xs text-muted-foreground">Animated Algorithm Visualization</p>
            </div>
          </motion.div>

          <motion.div 
            className="flex items-center gap-2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
          >
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="View on GitHub"
            >
              <Github className="w-5 h-5" />
            </a>
            <a
              href="#"
              className="p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground"
              title="Documentation"
            >
              <BookOpen className="w-5 h-5" />
            </a>
          </motion.div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 flex gap-4 min-h-0">
        {/* Left Panel - Controls */}
        <motion.aside
          className="w-80 shrink-0"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Controls />
        </motion.aside>

        {/* Center Panel - Visualizer */}
        <motion.section
          className="flex-1 panel min-w-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <PictorialVisualizer />
        </motion.section>

        {/* Right Panel - Debugger */}
        <motion.aside
          className="w-80 shrink-0"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <DebuggerPanel />
        </motion.aside>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border py-3">
        <div className="container mx-auto px-4 flex items-center justify-center text-xs text-muted-foreground">
          <span>Built with React, Zustand & Framer Motion</span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
