import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateHeapSortSteps(inputArray: number[]): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray];
  const n = arr.length;
  
  let totalComparisons = 0;
  let totalSwaps = 0;
  let passCount = 0;

  // Initial state
  steps.push({
    label: 'Initial Array',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: createEmptyHighlights(),
      after: createEmptyHighlights(),
    },
    pointers: {},
    moveArrows: [],
    codeLine: 0,
    explanation: 'Starting Heap Sort. First we build a max-heap, then extract elements one by one.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  function heapify(heapSize: number, i: number, sortedFrom: number): void {
    let largest = i;
    const left = 2 * i + 1;
    const right = 2 * i + 2;

    // Compare with left child
    if (left < heapSize) {
      totalComparisons++;
      if (arr[left] > arr[largest]) {
        largest = left;
      }
    }

    // Compare with right child
    if (right < heapSize) {
      totalComparisons++;
      if (arr[right] > arr[largest]) {
        largest = right;
      }
    }

    if (largest !== i) {
      const beforeState = [...arr];
      const temp = arr[i];
      arr[i] = arr[largest];
      arr[largest] = temp;
      totalSwaps++;

      const sortedIndices = sortedFrom < n ? Array.from({ length: n - sortedFrom }, (_, idx) => sortedFrom + idx) : [];

      steps.push({
        label: `Heapify: Swap`,
        before: beforeState,
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), swap: [i, largest], sorted: sortedIndices },
          after: { ...createEmptyHighlights(), swap: [i, largest], sorted: sortedIndices },
        },
        pointers: { parent: i, child: largest },
        moveArrows: [{ fromIndex: i, toIndex: largest, type: 'swap' }],
        codeLine: 2,
        explanation: `Swap arr[${i}]=${beforeState[i]} with larger child arr[${largest}]=${beforeState[largest]} to maintain heap property.`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });

      heapify(heapSize, largest, sortedFrom);
    }
  }

  // Build max heap
  passCount++;
  steps.push({
    label: 'Build Max Heap',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: createEmptyHighlights(),
      after: createEmptyHighlights(),
    },
    pointers: {},
    moveArrows: [],
    codeLine: 1,
    explanation: 'Building max-heap from the array. Parent nodes will be greater than their children.',
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
  });

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    heapify(n, i, n);
  }

  steps.push({
    label: 'Max Heap Built',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: { ...createEmptyHighlights(), key: [0] },
      after: { ...createEmptyHighlights(), key: [0] },
    },
    pointers: { max: 0 },
    moveArrows: [],
    codeLine: 1,
    explanation: `Max heap built! Root element ${arr[0]} is the maximum. Now extract elements one by one.`,
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
  });

  // Extract elements from heap
  for (let i = n - 1; i > 0; i--) {
    passCount++;
    const sortedIndices = Array.from({ length: n - i }, (_, idx) => i + 1 + idx);
    
    const beforeState = [...arr];
    const temp = arr[0];
    arr[0] = arr[i];
    arr[i] = temp;
    totalSwaps++;

    steps.push({
      label: `Extract Max`,
      before: beforeState,
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), swap: [0, i], sorted: sortedIndices },
        after: { ...createEmptyHighlights(), sorted: [...sortedIndices, i] },
      },
      pointers: { max: 0, end: i },
      moveArrows: [{ fromIndex: 0, toIndex: i, type: 'swap' }],
      codeLine: 3,
      explanation: `Extract max ${beforeState[0]} to position ${i}. Element is now sorted!`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
    });

    heapify(i, 0, i);
  }

  // Final sorted state
  steps.push({
    label: 'Sorted!',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: { ...createEmptyHighlights(), sorted: Array.from({ length: n }, (_, i) => i) },
      after: { ...createEmptyHighlights(), sorted: Array.from({ length: n }, (_, i) => i) },
    },
    pointers: {},
    moveArrows: [],
    codeLine: 4,
    explanation: `Array is now fully sorted! Total: ${totalComparisons} comparisons, ${totalSwaps} swaps.`,
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
  });

  return steps;
}
