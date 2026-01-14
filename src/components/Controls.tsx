import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipForward, SkipBack, RotateCcw, Shuffle, Zap } from 'lucide-react';
import { useDebuggerStore } from '@/store/useDebuggerStore';
import { ALGORITHMS } from '@/lib/stepTypes';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const Controls: React.FC = () => {
  const {
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

  const currentAlgorithm = ALGORITHMS.find(a => a.id === algorithm);
  const hasSteps = steps.length > 0;
  const isAtStart = currentStepIndex === 0;
  const isAtEnd = currentStepIndex === steps.length - 1;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header">
        <span className="panel-title">Controls</span>
        <Zap className="w-4 h-4 text-primary" />
      </div>

      <div className="flex-1 p-4 space-y-6 overflow-y-auto scrollbar-thin">
        {/* Algorithm Selection */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Algorithm</Label>
          <Select value={algorithm} onValueChange={(v) => setAlgorithm(v as any)}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ALGORITHMS.map(algo => (
                <SelectItem key={algo.id} value={algo.id}>
                  <span className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${algo.category === 'sorting' ? 'bg-primary' : 'bg-accent'}`} />
                    {algo.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Array Size Slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Array Size</Label>
            <span className="text-sm font-mono text-primary">{arraySize}</span>
          </div>
          <Slider
            value={[arraySize]}
            onValueChange={([v]) => setArraySize(v)}
            min={3}
            max={12}
            step={1}
            className="py-2"
          />
        </div>

        {/* Array Input */}
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">Array (comma-separated)</Label>
          <div className="flex gap-2">
            <Input
              value={arrayInput}
              onChange={(e) => setArrayInput(e.target.value)}
              placeholder="23,1,10,5,2"
              className="font-mono text-sm bg-secondary border-border"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={generateRandomArray}
              className="shrink-0"
              title="Generate random array"
            >
              <Shuffle className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Target Input (for searching) */}
        {currentAlgorithm?.category === 'searching' && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">Search Target</Label>
            <Input
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              placeholder="10"
              className="font-mono text-sm bg-secondary border-border"
            />
            <p className="text-xs text-muted-foreground">
              Note: Array will be sorted automatically for binary search.
            </p>
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateSteps}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          Generate Steps
        </Button>

        {/* Playback Controls */}
        {hasSteps && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={reset}
                disabled={isAtStart}
                className="control-btn"
                title="Reset"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                onClick={prevStep}
                disabled={isAtStart}
                className="control-btn"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>
              <button
                onClick={isPlaying ? pause : play}
                disabled={isAtEnd && !isPlaying}
                className="control-btn control-btn-primary w-12 h-12"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>
              <button
                onClick={nextStep}
                disabled={isAtEnd}
                className="control-btn"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>
            </div>

            {/* Progress */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {currentStepIndex + 1} / {steps.length}</span>
                <span className="font-mono">{steps[currentStepIndex]?.label}</span>
              </div>
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary"
                  initial={false}
                  animate={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              </div>
            </div>

            {/* Speed Control */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Speed</Label>
                <span className="text-sm font-mono text-primary">
                  {playbackSpeed < 500 ? 'Fast' : playbackSpeed < 1000 ? 'Normal' : 'Slow'}
                </span>
              </div>
              <Slider
                value={[2000 - playbackSpeed]}
                onValueChange={([v]) => setPlaybackSpeed(2000 - v)}
                min={0}
                max={1800}
                step={100}
                className="py-2"
              />
            </div>
          </motion.div>
        )}

        {/* View Mode Toggle */}
        {hasSteps && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">View Mode</Label>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
              <TabsList className="w-full bg-secondary">
                <TabsTrigger value="pictorial" className="flex-1 text-xs">Pictorial Rows</TabsTrigger>
                <TabsTrigger value="focus" className="flex-1 text-xs">Focus Mode</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
};
