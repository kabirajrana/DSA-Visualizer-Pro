import { create } from 'zustand';
import { Step, AlgorithmType, ALGORITHMS } from '@/lib/stepTypes';
import { generateInsertionSortSteps } from '@/lib/algorithms/sorting/insertionSortSteps';
import { generateBinarySearchSteps } from '@/lib/algorithms/searching/binarySearchSteps';

interface DebuggerState {
  // Algorithm settings
  algorithm: AlgorithmType;
  arrayInput: string;
  targetInput: string;
  arraySize: number;
  
  // Steps and playback
  steps: Step[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // ms per step
  
  // View mode
  viewMode: 'pictorial' | 'focus';
  
  // Actions
  setAlgorithm: (algorithm: AlgorithmType) => void;
  setArrayInput: (input: string) => void;
  setTargetInput: (input: string) => void;
  setArraySize: (size: number) => void;
  generateRandomArray: () => void;
  generateSteps: () => void;
  
  // Playback controls
  play: () => void;
  pause: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (index: number) => void;
  reset: () => void;
  setPlaybackSpeed: (speed: number) => void;
  
  // View
  setViewMode: (mode: 'pictorial' | 'focus') => void;
}

const DEFAULT_ARRAY = '23,1,10,5,2,7,15';
const DEFAULT_TARGET = '10';

export const useDebuggerStore = create<DebuggerState>((set, get) => ({
  algorithm: 'insertion-sort',
  arrayInput: DEFAULT_ARRAY,
  targetInput: DEFAULT_TARGET,
  arraySize: 7,
  steps: [],
  currentStepIndex: 0,
  isPlaying: false,
  playbackSpeed: 1000,
  viewMode: 'pictorial',

  setAlgorithm: (algorithm) => {
    set({ algorithm, steps: [], currentStepIndex: 0, isPlaying: false });
  },

  setArrayInput: (input) => {
    set({ arrayInput: input });
  },

  setTargetInput: (input) => {
    set({ targetInput: input });
  },

  setArraySize: (size) => {
    set({ arraySize: size });
  },

  generateRandomArray: () => {
    const size = get().arraySize;
    const arr = Array.from({ length: size }, () => Math.floor(Math.random() * 99) + 1);
    set({ arrayInput: arr.join(','), steps: [], currentStepIndex: 0, isPlaying: false });
  },

  generateSteps: () => {
    const { algorithm, arrayInput, targetInput } = get();
    const arr = arrayInput.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
    
    if (arr.length === 0) return;

    let steps: Step[] = [];
    
    if (algorithm === 'insertion-sort') {
      steps = generateInsertionSortSteps(arr);
    } else if (algorithm === 'binary-search') {
      const target = parseInt(targetInput, 10) || arr[0];
      steps = generateBinarySearchSteps(arr, target);
    }

    set({ steps, currentStepIndex: 0, isPlaying: false });
  },

  play: () => {
    set({ isPlaying: true });
  },

  pause: () => {
    set({ isPlaying: false });
  },

  nextStep: () => {
    const { currentStepIndex, steps } = get();
    if (currentStepIndex < steps.length - 1) {
      set({ currentStepIndex: currentStepIndex + 1 });
    } else {
      set({ isPlaying: false });
    }
  },

  prevStep: () => {
    const { currentStepIndex } = get();
    if (currentStepIndex > 0) {
      set({ currentStepIndex: currentStepIndex - 1 });
    }
  },

  goToStep: (index) => {
    const { steps } = get();
    if (index >= 0 && index < steps.length) {
      set({ currentStepIndex: index });
    }
  },

  reset: () => {
    set({ currentStepIndex: 0, isPlaying: false });
  },

  setPlaybackSpeed: (speed) => {
    set({ playbackSpeed: speed });
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
}));
