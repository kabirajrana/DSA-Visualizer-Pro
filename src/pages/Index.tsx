import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRightLeft, Search, Info, Bug, Menu, X } from 'lucide-react';
import { Controls } from '@/components/Controls';
import { PictorialVisualizer } from '@/components/PictorialVisualizer';
import { DebuggerPanel } from '@/components/DebuggerPanel';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

const Index: React.FC = () => {
  const { category, setCategory } = useDebuggerStore();
  const [mobileControlsOpen, setMobileControlsOpen] = React.useState(false);
  const [mobileDebuggerOpen, setMobileDebuggerOpen] = React.useState(false);

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
        {/* Header - fixed */}
        <header className="shrink-0 border-b border-border bg-card/80 backdrop-blur-md z-50">
          <div className="container mx-auto px-3 md:px-4 h-14 md:h-16 flex items-center justify-between gap-2">
            {/* Mobile Controls Toggle - sheet opens from bottom */}
            <Sheet open={mobileControlsOpen} onOpenChange={setMobileControlsOpen}>
              <SheetTrigger asChild>
                <button className="lg:hidden p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                  <Menu className="w-5 h-5" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[70vh] p-0 rounded-t-2xl">
                <div className="h-full overflow-y-auto pt-4">
                  <Controls />
                </div>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <motion.div className="flex items-center gap-2 md:gap-4" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="p-2 md:p-2.5 rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
                <Bug className="w-4 h-4 md:w-6 md:h-6 text-primary-foreground" />
              </div>
              <div className="hidden sm:block">
                <h1 className="font-bold text-base md:text-xl text-foreground">DSA Pictorial Debugger</h1>
                <p className="text-[10px] md:text-xs text-muted-foreground">Visual Algorithm Learning</p>
              </div>
            </motion.div>

            {/* Navigation Tabs */}
            <motion.nav className="flex items-center gap-1 md:gap-2 bg-secondary/50 p-1 md:p-1.5 rounded-xl" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
              <button onClick={() => setCategory('sorting')} className={`nav-tab ${category === 'sorting' ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
                <ArrowRightLeft className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Sorting</span>
              </button>
              <button onClick={() => setCategory('searching')} className={`nav-tab ${category === 'searching' ? 'nav-tab-active' : 'nav-tab-inactive'}`}>
                <Search className="w-3.5 h-3.5 md:w-4 md:h-4" />
                <span className="hidden sm:inline">Searching</span>
              </button>
              <Dialog>
                <DialogTrigger asChild>
                  <button className="nav-tab nav-tab-inactive hidden md:flex">
                    <Info className="w-4 h-4" />
                    <span>About</span>
                  </button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-primary to-accent">
                        <Bug className="w-5 h-5 text-primary-foreground" />
                      </div>
                      DSA Pictorial Debugger
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 text-sm text-muted-foreground">
                    <p>
                      <span className="font-semibold text-foreground">DSA Pictorial Debugger</span> is an interactive learning tool designed to help students and developers understand sorting and searching algorithms through step-by-step visual animations.
                    </p>
                    <p>
                      Each algorithm is broken down into clear, digestible steps showing "Before → After" states, pointer movements, and highlighted comparisons—just like textbook diagrams, but animated and interactive.
                    </p>
                    <div className="pt-2 border-t border-border">
                      <p className="text-xs">
                        <span className="font-medium text-foreground">Features:</span> 6 Sorting algorithms • 4 Searching algorithms • Real-time code highlighting • Pictorial step visualization
                      </p>
                    </div>
                    <p className="text-xs text-center pt-2">
                      Created by <span className="font-semibold text-foreground">Kabiraj</span>
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
            </motion.nav>

            {/* Right side: Theme Toggle + Mobile Debugger */}
            <div className="flex items-center gap-2">
              <ThemeToggle />
              
              {/* Mobile Debugger Toggle */}
              <Sheet open={mobileDebuggerOpen} onOpenChange={setMobileDebuggerOpen}>
                <SheetTrigger asChild>
                  <button className="lg:hidden p-2 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors">
                    <Info className="w-5 h-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[300px] p-0">
                  <div className="h-full overflow-y-auto">
                    <DebuggerPanel />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </header>

        {/* Main Content - fills remaining height */}
        <main className="flex-1 container mx-auto p-2 md:p-4 flex flex-col lg:flex-row gap-3 md:gap-4 min-h-0 overflow-hidden">
          {/* Left Panel - Controls (fixed, no scroll) */}
          <motion.aside 
            className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 shrink-0 max-h-full overflow-y-auto" 
            initial={{ opacity: 0, x: -20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
          >
            <Controls />
          </motion.aside>

          {/* Center Panel - Visualizer (only this section scrolls internally) */}
          <motion.section 
            className="flex-1 panel min-w-0 min-h-0 overflow-hidden" 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ delay: 0.2 }}
          >
            <PictorialVisualizer />
          </motion.section>

          {/* Right Panel - Debugger (fixed, no page scroll) */}
          <motion.aside 
            className="hidden lg:flex lg:flex-col lg:w-72 xl:w-80 shrink-0 max-h-full overflow-y-auto" 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.3 }}
          >
            <DebuggerPanel />
          </motion.aside>
        </main>

        {/* Mobile Bottom Bar for quick actions */}
        <div className="lg:hidden shrink-0 border-t border-border py-2 px-3 bg-card/80 backdrop-blur-md">
          <div className="flex items-center justify-around text-xs text-muted-foreground">
            <button 
              onClick={() => setMobileControlsOpen(true)}
              className="flex flex-col items-center gap-1 p-2 hover:text-foreground transition-colors"
            >
              <Menu className="w-5 h-5" />
              <span>Controls</span>
            </button>
            <div className={`flex flex-col items-center gap-1 p-2 ${category === 'sorting' ? 'text-primary' : ''}`}>
              <ArrowRightLeft className="w-5 h-5" />
              <span>Sorting</span>
            </div>
            <div className={`flex flex-col items-center gap-1 p-2 ${category === 'searching' ? 'text-sorted' : ''}`}>
              <Search className="w-5 h-5" />
              <span>Searching</span>
            </div>
            <button 
              onClick={() => setMobileDebuggerOpen(true)}
              className="flex flex-col items-center gap-1 p-2 hover:text-foreground transition-colors"
            >
              <Info className="w-5 h-5" />
              <span>Debugger</span>
            </button>
          </div>
        </div>

        {/* Footer - Desktop only */}
        <footer className="hidden md:block shrink-0 border-t border-border py-3 bg-card/50">
          <div className="container mx-auto px-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <span>Created by <span className="font-semibold text-foreground">Kabiraj</span></span>
            <span>•</span>
            <span>© 2026 All Rights Reserved</span>
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