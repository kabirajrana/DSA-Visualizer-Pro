import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Search, Info, Bug } from 'lucide-react';
import { Controls } from '@/components/Controls';
import { PictorialVisualizer } from '@/components/PictorialVisualizer';
import { DebuggerPanel } from '@/components/DebuggerPanel';
import { useDebuggerStore } from '@/store/useDebuggerStore';

const Index: React.FC = () => {
  const { category, setCategory } = useDebuggerStore();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <motion.div className="flex items-center gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Bug className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-xl text-foreground">DSA Pictorial Debugger</h1>
              <p className="text-xs text-muted-foreground">Visual Algorithm Learning Tool</p>
            </div>
          </motion.div>

          {/* Navigation Tabs */}
          <motion.nav className="flex items-center gap-2 bg-secondary/50 p-1.5 rounded-xl" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <button onClick={() => setCategory('sorting')} className={`nav-tab ${category === 'sorting' ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
              <ArrowRightLeft className="w-4 h-4" />
              <span>Sorting</span>
            </button>
            <button onClick={() => setCategory('searching')} className={`nav-tab ${category === 'searching' ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
              <Search className="w-4 h-4" />
              <span>Searching</span>
            </button>
            <button className="nav-tab nav-tab-inactive">
              <Info className="w-4 h-4" />
              <span>About</span>
            </button>
          </motion.nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto p-4 flex gap-4 min-h-0">
        <motion.aside className="w-80 shrink-0" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
          <Controls />
        </motion.aside>

        <motion.section className="flex-1 panel min-w-0" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <PictorialVisualizer />
        </motion.section>

        <motion.aside className="w-80 shrink-0" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
          <DebuggerPanel />
        </motion.aside>
      </main>

      {/* Footer */}
      <footer className="shrink-0 border-t border-border py-4 bg-card/50">
        <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Built with React, Zustand & Framer Motion</span>
          <span>•</span>
          <span className={category === 'sorting' ? 'text-primary' : 'text-sorted'}>
            {category === 'sorting' ? '6 Sorting' : '4 Searching'} Algorithms
          </span>
        </div>
      </footer>
    </div>
  );
};

export default Index;
