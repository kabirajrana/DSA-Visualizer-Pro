import { create } from 'zustand';
import { Step, AlgorithmType, SORTING_ALGORITHMS, SEARCHING_ALGORITHMS, ALGORITHMS } from '@/lib/stepTypes';
import { generateBubbleSortSteps } from '@/lib/algorithms/sorting/bubbleSortSteps';
import { generateSelectionSortSteps } from '@/lib/algorithms/sorting/selectionSortSteps';
import { generateInsertionSortSteps } from '@/lib/algorithms/sorting/insertionSortSteps';
import { generateMergeSortSteps } from '@/lib/algorithms/sorting/mergeSortSteps';
import { generateQuickSortSteps } from '@/lib/algorithms/sorting/quickSortSteps';
import { generateHeapSortSteps } from '@/lib/algorithms/sorting/heapSortSteps';
import { generateLinearSearchSteps } from '@/lib/algorithms/searching/linearSearchSteps';
import { generateBinarySearchSteps } from '@/lib/algorithms/searching/binarySearchSteps';
import { generateJumpSearchSteps } from '@/lib/algorithms/searching/jumpSearchSteps';
import { generateInterpolationSearchSteps } from '@/lib/algorithms/searching/interpolationSearchSteps';

export type CategoryTab = 'sorting' | 'searching';

interface DebuggerState {
  // Category and algorithm settings
  category: CategoryTab;
  algorithm: AlgorithmType;
  arrayInput: string;
  targetInput: string;
  arraySize: number;
  
  // Steps and playback
  steps: Step[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number;
  
  // View mode
  viewMode: 'pictorial' | 'focus' | 'bars';
  
  // Actions
  setCategory: (category: CategoryTab) => void;
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
  setViewMode: (mode: 'pictorial' | 'focus' | 'bars') => void;
}

const DEFAULT_ARRAY = '23,1,10,5,2,7,15';
const DEFAULT_TARGET = '10';

export const useDebuggerStore = create<DebuggerState>((set, get) => ({
  category: 'sorting',
  algorithm: 'bubble-sort',
  arrayInput: DEFAULT_ARRAY,
  targetInput: DEFAULT_TARGET,
  arraySize: 7,
  steps: [],
  currentStepIndex: 0,
  isPlaying: false,
  playbackSpeed: 1000,
  viewMode: 'pictorial',

  setCategory: (category) => {
    const defaultAlgo = category === 'sorting' 
      ? SORTING_ALGORITHMS[0].id 
      : SEARCHING_ALGORITHMS[0].id;
    set({ category, algorithm: defaultAlgo, steps: [], currentStepIndex: 0, isPlaying: false });
  },

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
    
    switch (algorithm) {
      case 'bubble-sort':
        steps = generateBubbleSortSteps(arr);
        break;
      case 'selection-sort':
        steps = generateSelectionSortSteps(arr);
        break;
      case 'insertion-sort':
        steps = generateInsertionSortSteps(arr);
        break;
      case 'merge-sort':
        steps = generateMergeSortSteps(arr);
        break;
      case 'quick-sort':
        steps = generateQuickSortSteps(arr);
        break;
      case 'heap-sort':
        steps = generateHeapSortSteps(arr);
        break;
      case 'linear-search':
        const linearTarget = parseInt(targetInput, 10) || arr[0];
        steps = generateLinearSearchSteps(arr, linearTarget);
        break;
      case 'binary-search':
        const binaryTarget = parseInt(targetInput, 10) || arr[0];
        steps = generateBinarySearchSteps(arr, binaryTarget);
        break;
      case 'jump-search':
        const jumpTarget = parseInt(targetInput, 10) || arr[0];
        steps = generateJumpSearchSteps(arr, jumpTarget);
        break;
      case 'interpolation-search':
        const interpTarget = parseInt(targetInput, 10) || arr[0];
        steps = generateInterpolationSearchSteps(arr, interpTarget);
        break;
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
