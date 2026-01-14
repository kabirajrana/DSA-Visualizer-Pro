export type HighlightType = 'compare' | 'swap' | 'key' | 'sorted' | 'found' | 'shift';

export interface Highlights {
  compare: number[];
  swap: number[];
  key: number[];
  sorted: number[];
  found: number[];
  shift: number[];
}

export interface MoveArrow {
  fromIndex: number;
  toIndex: number;
  type: 'swap' | 'shift' | 'compare';
}

export interface Metrics {
  comparisons: number;
  swaps: number;
  passes: number;
}

export interface Step {
  label: string;
  before: number[];
  after: number[];
  highlights: {
    before: Highlights;
    after: Highlights;
  };
  pointers: Record<string, number | null>;
  moveArrows: MoveArrow[];
  codeLine: number;
  explanation: string;
  metrics: Metrics;
}

export type AlgorithmType = 'insertion-sort' | 'binary-search';

export interface AlgorithmInfo {
  id: AlgorithmType;
  name: string;
  category: 'sorting' | 'searching';
  timeComplexity: {
    best: string;
    average: string;
    worst: string;
  };
  spaceComplexity: string;
  description: string;
}

export const ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    category: 'sorting',
    timeComplexity: {
      best: 'O(n)',
      average: 'O(n²)',
      worst: 'O(n²)',
    },
    spaceComplexity: 'O(1)',
    description: 'Builds sorted array one element at a time by inserting each element into its correct position.',
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'searching',
    timeComplexity: {
      best: 'O(1)',
      average: 'O(log n)',
      worst: 'O(log n)',
    },
    spaceComplexity: 'O(1)',
    description: 'Efficiently finds target in sorted array by repeatedly dividing search space in half.',
  },
];

export function createEmptyHighlights(): Highlights {
  return {
    compare: [],
    swap: [],
    key: [],
    sorted: [],
    found: [],
    shift: [],
  };
}
