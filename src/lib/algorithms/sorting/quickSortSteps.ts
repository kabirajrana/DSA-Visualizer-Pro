import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateQuickSortSteps(inputArray: number[]): Step[] {
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
    explanation: 'Starting Quick Sort. We pick a pivot, partition array around it, then sort sub-arrays recursively.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  function quickSort(low: number, high: number): void {
    if (low < high) {
      const pivotIndex = partition(low, high);
      quickSort(low, pivotIndex - 1);
      quickSort(pivotIndex + 1, high);
    }
  }

  function partition(low: number, high: number): number {
    passCount++;
    const pivot = arr[high];
    let i = low - 1;

    // Show pivot selection
    steps.push({
      label: `Partition [${low}-${high}]`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), pivot: [high] },
        after: { ...createEmptyHighlights(), pivot: [high] },
      },
      pointers: { low, high, pivot: high, i },
      moveArrows: [],
      codeLine: 1,
      explanation: `Partitioning array[${low}...${high}]. Pivot = ${pivot} (last element).`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
    });

    for (let j = low; j < high; j++) {
      totalComparisons++;
      
      // Compare step
      steps.push({
        label: `Compare with Pivot`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [j], pivot: [high], key: i >= low ? [i] : [] },
          after: { ...createEmptyHighlights(), compare: [j], pivot: [high], key: i >= low ? [i] : [] },
        },
        pointers: { low, high, pivot: high, i, j },
        moveArrows: [{ fromIndex: j, toIndex: high, type: 'compare' }],
        codeLine: 2,
        explanation: `Compare arr[${j}]=${arr[j]} with pivot=${pivot}. ${arr[j] <= pivot ? 'Less or equal, will swap.' : 'Greater, skip.'}`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });

      if (arr[j] <= pivot) {
        i++;
        if (i !== j) {
          const beforeState = [...arr];
          const temp = arr[i];
          arr[i] = arr[j];
          arr[j] = temp;
          totalSwaps++;

          steps.push({
            label: `Swap Elements`,
            before: beforeState,
            after: [...arr],
            highlights: {
              before: { ...createEmptyHighlights(), swap: [i, j], pivot: [high] },
              after: { ...createEmptyHighlights(), swap: [i, j], pivot: [high] },
            },
            pointers: { low, high, pivot: high, i, j },
            moveArrows: [{ fromIndex: i, toIndex: j, type: 'swap' }],
            codeLine: 3,
            explanation: `Swap arr[${i}]=${beforeState[i]} and arr[${j}]=${beforeState[j]} to move smaller element left.`,
            metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
          });
        }
      }
    }

    // Place pivot in correct position
    if (i + 1 !== high) {
      const beforeState = [...arr];
      const temp = arr[i + 1];
      arr[i + 1] = arr[high];
      arr[high] = temp;
      totalSwaps++;

      steps.push({
        label: `Place Pivot`,
        before: beforeState,
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), swap: [i + 1, high], pivot: [high] },
          after: { ...createEmptyHighlights(), sorted: [i + 1] },
        },
        pointers: { pivot: i + 1 },
        moveArrows: [{ fromIndex: high, toIndex: i + 1, type: 'swap' }],
        codeLine: 4,
        explanation: `Move pivot ${pivot} to its correct position at index ${i + 1}. Pivot is now sorted!`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });
    } else {
      steps.push({
        label: `Pivot in Place`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), sorted: [i + 1] },
          after: { ...createEmptyHighlights(), sorted: [i + 1] },
        },
        pointers: { pivot: i + 1 },
        moveArrows: [],
        codeLine: 4,
        explanation: `Pivot ${pivot} is already at its correct position ${i + 1}!`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });
    }

    return i + 1;
  }

  quickSort(0, n - 1);

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
    codeLine: 5,
    explanation: `Array is now fully sorted! Total: ${totalComparisons} comparisons, ${totalSwaps} swaps.`,
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
  });

  return steps;
}
