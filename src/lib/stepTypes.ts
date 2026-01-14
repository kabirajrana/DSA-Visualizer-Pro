export type HighlightType = 'compare' | 'swap' | 'key' | 'sorted' | 'found' | 'shift' | 'pivot' | 'eliminated';

export interface Highlights {
  compare: number[];
  swap: number[];
  key: number[];
  sorted: number[];
  found: number[];
  shift: number[];
  pivot: number[];
  eliminated: number[];
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

export type SortingAlgorithm = 'bubble-sort' | 'selection-sort' | 'insertion-sort' | 'merge-sort' | 'quick-sort' | 'heap-sort';
export type SearchingAlgorithm = 'linear-search' | 'binary-search' | 'jump-search' | 'interpolation-search';
export type AlgorithmType = SortingAlgorithm | SearchingAlgorithm;

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
  stable?: boolean;
}

export const SORTING_ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'bubble-sort',
    name: 'Bubble Sort',
    category: 'sorting',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    description: 'Repeatedly swaps adjacent elements if they are in wrong order. Simple but inefficient for large datasets.',
    stable: true,
  },
  {
    id: 'selection-sort',
    name: 'Selection Sort',
    category: 'sorting',
    timeComplexity: { best: 'O(n²)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    description: 'Finds minimum element in unsorted part and places it at beginning. Minimizes swaps.',
    stable: false,
  },
  {
    id: 'insertion-sort',
    name: 'Insertion Sort',
    category: 'sorting',
    timeComplexity: { best: 'O(n)', average: 'O(n²)', worst: 'O(n²)' },
    spaceComplexity: 'O(1)',
    description: 'Builds sorted array one element at a time by inserting each element into its correct position.',
    stable: true,
  },
  {
    id: 'merge-sort',
    name: 'Merge Sort',
    category: 'sorting',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(n)',
    description: 'Divides array into halves, sorts recursively, then merges. Consistent performance.',
    stable: true,
  },
  {
    id: 'quick-sort',
    name: 'Quick Sort',
    category: 'sorting',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n²)' },
    spaceComplexity: 'O(log n)',
    description: 'Picks a pivot, partitions around it, then recursively sorts sub-arrays. Very fast in practice.',
    stable: false,
  },
  {
    id: 'heap-sort',
    name: 'Heap Sort',
    category: 'sorting',
    timeComplexity: { best: 'O(n log n)', average: 'O(n log n)', worst: 'O(n log n)' },
    spaceComplexity: 'O(1)',
    description: 'Uses binary heap data structure to sort. In-place with guaranteed O(n log n).',
    stable: false,
  },
];

export const SEARCHING_ALGORITHMS: AlgorithmInfo[] = [
  {
    id: 'linear-search',
    name: 'Linear Search',
    category: 'searching',
    timeComplexity: { best: 'O(1)', average: 'O(n)', worst: 'O(n)' },
    spaceComplexity: 'O(1)',
    description: 'Checks each element sequentially. Works on unsorted arrays.',
  },
  {
    id: 'binary-search',
    name: 'Binary Search',
    category: 'searching',
    timeComplexity: { best: 'O(1)', average: 'O(log n)', worst: 'O(log n)' },
    spaceComplexity: 'O(1)',
    description: 'Efficiently finds target in sorted array by repeatedly dividing search space in half.',
  },
  {
    id: 'jump-search',
    name: 'Jump Search',
    category: 'searching',
    timeComplexity: { best: 'O(1)', average: 'O(√n)', worst: 'O(√n)' },
    spaceComplexity: 'O(1)',
    description: 'Jumps ahead by √n steps, then linear search backwards. Good for sorted arrays.',
  },
  {
    id: 'interpolation-search',
    name: 'Interpolation Search',
    category: 'searching',
    timeComplexity: { best: 'O(1)', average: 'O(log log n)', worst: 'O(n)' },
    spaceComplexity: 'O(1)',
    description: 'Uses value-based position estimation. Best for uniformly distributed sorted data.',
  },
];

export const ALGORITHMS: AlgorithmInfo[] = [...SORTING_ALGORITHMS, ...SEARCHING_ALGORITHMS];

export function createEmptyHighlights(): Highlights {
  return {
    compare: [],
    swap: [],
    key: [],
    sorted: [],
    found: [],
    shift: [],
    pivot: [],
    eliminated: [],
  };
}
