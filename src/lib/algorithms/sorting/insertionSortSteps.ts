import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateInsertionSortSteps(inputArray: number[]): Step[] {
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
      before: { ...createEmptyHighlights(), sorted: [0] },
      after: { ...createEmptyHighlights(), sorted: [0] },
    },
    pointers: { i: 1, j: null, key: null },
    moveArrows: [],
    codeLine: 0,
    explanation: 'Starting with the original array. First element is considered sorted.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  for (let i = 1; i < n; i++) {
    passCount++;
    const key = arr[i];
    let j = i - 1;
    
    const beforeState = [...arr];
    const sortedIndices = Array.from({ length: i }, (_, idx) => idx);

    // Show picking up the key
    steps.push({
      label: `Pass ${passCount}: Pick Key`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: [i], sorted: sortedIndices },
        after: { ...createEmptyHighlights(), key: [i], sorted: sortedIndices },
      },
      pointers: { i, j: null, key: i },
      moveArrows: [],
      codeLine: 1,
      explanation: `Pick element at index ${i} (value: ${key}) as the key to insert.`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
    });

    // Compare and shift
    while (j >= 0 && arr[j] > key) {
      totalComparisons++;
      
      // Show comparison
      steps.push({
        label: `Pass ${passCount}: Compare`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [j], key: [i], sorted: sortedIndices.filter(x => x !== j) },
          after: { ...createEmptyHighlights(), compare: [j], key: [i], sorted: sortedIndices.filter(x => x !== j) },
        },
        pointers: { i, j, key: i },
        moveArrows: [{ fromIndex: j, toIndex: i, type: 'compare' }],
        codeLine: 2,
        explanation: `Compare arr[${j}]=${arr[j]} with key=${key}. Since ${arr[j]} > ${key}, we need to shift.`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });

      // Perform shift
      const beforeShift = [...arr];
      arr[j + 1] = arr[j];
      totalSwaps++;

      steps.push({
        label: `Pass ${passCount}: Shift`,
        before: beforeShift,
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), shift: [j], key: [i], sorted: sortedIndices.filter(x => x !== j) },
          after: { ...createEmptyHighlights(), shift: [j + 1], key: [i], sorted: sortedIndices.filter(x => x !== j && x !== j + 1) },
        },
        pointers: { i, j, key: i },
        moveArrows: [{ fromIndex: j, toIndex: j + 1, type: 'shift' }],
        codeLine: 3,
        explanation: `Shift arr[${j}]=${beforeShift[j]} to position ${j + 1}.`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });

      j--;
    }

    // Final comparison (when we stop)
    if (j >= 0) {
      totalComparisons++;
      steps.push({
        label: `Pass ${passCount}: Compare`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [j], sorted: sortedIndices },
          after: { ...createEmptyHighlights(), compare: [j], sorted: sortedIndices },
        },
        pointers: { i, j, key: i },
        moveArrows: [],
        codeLine: 2,
        explanation: `Compare arr[${j}]=${arr[j]} with key=${key}. Since ${arr[j]} ≤ ${key}, stop shifting.`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
      });
    }

    // Insert key
    const beforeInsert = [...arr];
    arr[j + 1] = key;
    const newSortedIndices = Array.from({ length: i + 1 }, (_, idx) => idx);

    steps.push({
      label: `Pass ${passCount}: Insert Key`,
      before: beforeInsert,
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: [j + 1], sorted: sortedIndices },
        after: { ...createEmptyHighlights(), key: [j + 1], sorted: newSortedIndices },
      },
      pointers: { i, j: j + 1, key: j + 1 },
      moveArrows: [{ fromIndex: i, toIndex: j + 1, type: 'shift' }],
      codeLine: 4,
      explanation: `Insert key=${key} at position ${j + 1}.`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
    });
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
    explanation: `Array is now fully sorted! Total: ${totalComparisons} comparisons, ${totalSwaps} shifts.`,
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: passCount },
  });

  return steps;
}
