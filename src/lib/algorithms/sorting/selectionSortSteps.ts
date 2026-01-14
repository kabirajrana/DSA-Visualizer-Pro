import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateSelectionSortSteps(inputArray: number[]): Step[] {
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
    pointers: { i: 0 },
    moveArrows: [],
    codeLine: 0,
    explanation: 'Starting with the original array. We will find the minimum element and place it at the beginning.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  for (let i = 0; i < n - 1; i++) {
    passCount++;
    let minIdx = i;
    const sortedIndices = Array.from({ length: i }, (_, idx) => idx);

    // Show starting position
    steps.push({
      label: `Pass ${passCount}: Find Minimum`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: [i], sorted: sortedIndices },
        after: { ...createEmptyHighlights(), key: [i], sorted: sortedIndices },
      },
      pointers: { i, minIdx: i },
      moveArrows: [],
      codeLine: 1,
      explanation: `Start pass ${passCount}. Looking for minimum in unsorted portion [${i}...${n - 1}].`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
    });

    for (let j = i + 1; j < n; j++) {
      totalComparisons++;

      // Compare step
      steps.push({
        label: `Pass ${passCount}: Compare`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [j], key: [minIdx], sorted: sortedIndices },
          after: { ...createEmptyHighlights(), compare: [j], key: [minIdx], sorted: sortedIndices },
        },
        pointers: { i, j, minIdx },
        moveArrows: [{ fromIndex: minIdx, toIndex: j, type: 'compare' }],
        codeLine: 2,
        explanation: `Compare arr[${j}]=${arr[j]} with current minimum arr[${minIdx}]=${arr[minIdx]}. ${arr[j] < arr[minIdx] ? 'New minimum found!' : 'Not smaller.'}`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });

      if (arr[j] < arr[minIdx]) {
        minIdx = j;
        steps.push({
          label: `Pass ${passCount}: Update Min`,
          before: [...arr],
          after: [...arr],
          highlights: {
            before: { ...createEmptyHighlights(), key: [minIdx], sorted: sortedIndices },
            after: { ...createEmptyHighlights(), key: [minIdx], sorted: sortedIndices },
          },
          pointers: { i, j, minIdx },
          moveArrows: [],
          codeLine: 3,
          explanation: `Updated minimum index to ${minIdx} (value: ${arr[minIdx]}).`,
          metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
        });
      }
    }

    // Swap minimum with first unsorted element
    if (minIdx !== i) {
      const beforeState = [...arr];
      const temp = arr[i];
      arr[i] = arr[minIdx];
      arr[minIdx] = temp;
      totalSwaps++;

      steps.push({
        label: `Pass ${passCount}: Swap`,
        before: beforeState,
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), swap: [i, minIdx], sorted: sortedIndices },
          after: { ...createEmptyHighlights(), swap: [i, minIdx], sorted: [...sortedIndices, i] },
        },
        pointers: { i, minIdx },
        moveArrows: [{ fromIndex: minIdx, toIndex: i, type: 'swap' }],
        codeLine: 4,
        explanation: `Swap arr[${i}]=${beforeState[i]} with minimum arr[${minIdx}]=${beforeState[minIdx]}.`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });
    } else {
      steps.push({
        label: `Pass ${passCount}: No Swap`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), sorted: [...sortedIndices, i] },
          after: { ...createEmptyHighlights(), sorted: [...sortedIndices, i] },
        },
        pointers: { i },
        moveArrows: [],
        codeLine: 4,
        explanation: `Element at position ${i} is already the minimum. No swap needed.`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });
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
    codeLine: 5,
    explanation: `Array is now fully sorted! Total: ${totalComparisons} comparisons, ${totalSwaps} swaps.`,
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
  });

  return steps;
}
