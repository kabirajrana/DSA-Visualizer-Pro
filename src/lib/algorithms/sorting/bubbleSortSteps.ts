import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateBubbleSortSteps(inputArray: number[]): Step[] {
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
    pointers: { i: 0, j: null },
    moveArrows: [],
    codeLine: 0,
    explanation: 'Starting with the original unsorted array. We will compare adjacent elements and swap if needed.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  for (let i = 0; i < n - 1; i++) {
    passCount++;
    let swapped = false;
    const sortedIndices = Array.from({ length: i }, (_, idx) => n - 1 - idx);

    for (let j = 0; j < n - i - 1; j++) {
      totalComparisons++;
      const beforeState = [...arr];

      // Compare step
      steps.push({
        label: `Pass ${passCount}: Compare`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [j, j + 1], sorted: sortedIndices },
          after: { ...createEmptyHighlights(), compare: [j, j + 1], sorted: sortedIndices },
        },
        pointers: { i: n - i - 1, j },
        moveArrows: [{ fromIndex: j, toIndex: j + 1, type: 'compare' }],
        codeLine: 1,
        explanation: `Compare arr[${j}]=${arr[j]} with arr[${j + 1}]=${arr[j + 1]}. ${arr[j] > arr[j + 1] ? 'Swap needed!' : 'No swap needed.'}`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });

      if (arr[j] > arr[j + 1]) {
        // Swap
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        totalSwaps++;
        swapped = true;

        steps.push({
          label: `Pass ${passCount}: Swap`,
          before: beforeState,
          after: [...arr],
          highlights: {
            before: { ...createEmptyHighlights(), swap: [j, j + 1], sorted: sortedIndices },
            after: { ...createEmptyHighlights(), swap: [j, j + 1], sorted: sortedIndices },
          },
          pointers: { i: n - i - 1, j },
          moveArrows: [{ fromIndex: j, toIndex: j + 1, type: 'swap' }],
          codeLine: 2,
          explanation: `Swapped ${beforeState[j]} and ${beforeState[j + 1]} because ${beforeState[j]} > ${beforeState[j + 1]}.`,
          metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
        });
      }
    }

    // Element bubbled to position
    const newSortedIndices = Array.from({ length: i + 1 }, (_, idx) => n - 1 - idx);
    steps.push({
      label: `Pass ${passCount}: Element Sorted`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), sorted: newSortedIndices },
        after: { ...createEmptyHighlights(), sorted: newSortedIndices },
      },
      pointers: {},
      moveArrows: [],
      codeLine: 3,
      explanation: `Pass ${passCount} complete. Element ${arr[n - i - 1]} is now in its final position.`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
    });

    if (!swapped) {
      break;
    }
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
