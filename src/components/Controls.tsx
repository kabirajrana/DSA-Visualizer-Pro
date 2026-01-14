import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Shuffle, Zap, HelpCircle } from 'lucide-react';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { SORTING_ALGORITHMS, SEARCHING_ALGORITHMS } from '@/lib/stepTypes';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export const Controls: React.FC = () => {
  const {
    category,
    algorithm,
    setAlgorithm,
    arrayInput,
    setArrayInput,
    targetInput,
    setTargetInput,
    arraySize,
    setArraySize,
    generateRandomArray,
    generateSteps,
    isPlaying,
    play,
    pause,
    nextStep,
    prevStep,
    reset,
    playbackSpeed,
    setPlaybackSpeed,
    steps,
    currentStepIndex,
    viewMode,
    setViewMode,
  } = useDebuggerStore();

  const algorithms = category === 'sorting' ? SORTING_ALGORITHMS : SEARCHING_ALGORITHMS;
  const currentAlgorithm = algorithms.find(a => a.id === algorithm);
  const hasSteps = steps.length > 0;
  const isAtStart = currentStepIndex === 0;
  const isAtEnd = currentStepIndex === steps.length - 1;
  const isSearching = category === 'searching';

  return (
    <TooltipProvider delayDuration={300}>
      <div className="panel h-full flex flex-col">
        <div className="panel-header">
          <span className="panel-title">Controls</span>
          <Zap className="w-4 h-4 text-primary" />
        </div>

        <div className="flex-1 p-5 space-y-5 overflow-y-auto scrollbar-thin">
          {/* Algorithm Selection */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Algorithm</Label>
              <Tooltip>
                <TooltipTrigger><HelpCircle className="w-3.5 h-3.5 text-muted-foreground" /></TooltipTrigger>
                <TooltipContent className="tooltip-content">
                  <p>Choose an algorithm to visualize step-by-step</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as any)}>
              <SelectTrigger className="bg-secondary border-border h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {algorithms.map(algo => (
                  <SelectItem key={algo.id} value={algo.id}>
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${category === 'sorting' ? 'bg-primary' : 'bg-sorted'}`} />
                      {algo.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {currentAlgorithm && (
              <p className="text-xs text-muted-foreground leading-relaxed">{currentAlgorithm.description}</p>
            )}
          </div>

          {/* Array Size Slider */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Array Size</Label>
              <span className="text-sm font-mono text-primary font-bold">{arraySize}</span>
            </div>
            <Slider value={[arraySize]} onValueChange={([v]) => setArraySize(v)} min={3} max={12} step={1} className="py-2" />
          </div>

          {/* Array Input */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Array (comma-separated)</Label>
            <div className="flex gap-2">
              <Input value={arrayInput} onChange={(e) => setArrayInput(e.target.value)} placeholder="23,1,10,5,2" className="font-mono text-sm bg-secondary border-border h-11" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={generateRandomArray} className="shrink-0 h-11 w-11">
                    <Shuffle className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent><p>Generate random array</p></TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Target Input (for searching) */}
          {isSearching && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search Target</Label>
              <Input value={targetInput} onChange={(e) => setTargetInput(e.target.value)} placeholder="10" className="font-mono text-sm bg-secondary border-border h-11" />
              {algorithm !== 'linear-search' && (
                <p className="text-xs text-muted-foreground">⚡ Array will be sorted automatically</p>
              )}
            </div>
          )}

          {/* Generate Button */}
          <Button onClick={generateSteps} className="w-full h-12 text-base font-semibold bg-primary text-primary-foreground hover:bg-primary/90 glow-primary">
            Generate Steps
          </Button>

          {/* Playback Controls */}
          {hasSteps && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="flex items-center justify-center gap-3">
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={reset} disabled={isAtStart} className="control-btn"><RotateCcw className="w-4 h-4" /></button>
                </TooltipTrigger><TooltipContent><p>Reset to start</p></TooltipContent></Tooltip>
                
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={prevStep} disabled={isAtStart} className="control-btn"><SkipBack className="w-4 h-4" /></button>
                </TooltipTrigger><TooltipContent><p>Previous step</p></TooltipContent></Tooltip>
                
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={isPlaying ? pause : play} disabled={isAtEnd && !isPlaying} className="control-btn control-btn-primary w-14 h-14">
                    {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
                  </button>
                </TooltipTrigger><TooltipContent><p>{isPlaying ? 'Pause' : 'Play'}</p></TooltipContent></Tooltip>
                
                <Tooltip><TooltipTrigger asChild>
                  <button onClick={nextStep} disabled={isAtEnd} className="control-btn"><SkipForward className="w-4 h-4" /></button>
                </TooltipTrigger><TooltipContent><p>Next step</p></TooltipContent></Tooltip>
              </div>

              {/* Progress */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span className="font-medium">Step {currentStepIndex + 1} / {steps.length}</span>
                  <span className="font-mono text-primary">{steps[currentStepIndex]?.label}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div className="h-full bg-gradient-to-r from-primary to-accent" initial={false} animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} />
                </div>
              </div>

              {/* Speed Control */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wider">Speed</Label>
                  <span className="text-sm font-mono text-primary font-bold">
                    {playbackSpeed < 500 ? '🚀 Fast' : playbackSpeed < 1000 ? '⚡ Normal' : '🐢 Slow'}
                  </span>
                </div>
                <Slider value={[2000 - playbackSpeed]} onValueChange={([v]) => setPlaybackSpeed(2000 - v)} min={0} max={1800} step={100} className="py-2" />
              </div>
            </motion.div>
          )}

          {/* View Mode Toggle */}
          {hasSteps && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">View Mode</Label>
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
                <TabsList className="w-full bg-secondary h-11">
                  <TabsTrigger value="pictorial" className="flex-1 text-xs">📚 Pictorial</TabsTrigger>
                  <TabsTrigger value="focus" className="flex-1 text-xs">🎯 Focus</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};
