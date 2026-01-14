import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateMergeSortSteps(inputArray: number[]): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray];
  const n = arr.length;
  
  let totalComparisons = 0;
  let totalMerges = 0;
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
    explanation: 'Starting Merge Sort. We will divide the array, sort each half, then merge them back together.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  function mergeSort(left: number, right: number): void {
    if (left >= right) return;

    const mid = Math.floor((left + right) / 2);
    passCount++;

    // Show divide step
    steps.push({
      label: `Divide [${left}-${right}]`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: Array.from({ length: mid - left + 1 }, (_, i) => left + i), shift: Array.from({ length: right - mid }, (_, i) => mid + 1 + i) },
        after: { ...createEmptyHighlights(), key: Array.from({ length: mid - left + 1 }, (_, i) => left + i), shift: Array.from({ length: right - mid }, (_, i) => mid + 1 + i) },
      },
      pointers: { left, mid, right },
      moveArrows: [],
      codeLine: 1,
      explanation: `Divide array[${left}...${right}] into two halves: [${left}...${mid}] and [${mid + 1}...${right}].`,
      metrics: { comparisons: totalComparisons, swaps: totalMerges, passes: passCount },
    });

    mergeSort(left, mid);
    mergeSort(mid + 1, right);
    merge(left, mid, right);
  }

  function merge(left: number, mid: number, right: number): void {
    const leftArr = arr.slice(left, mid + 1);
    const rightArr = arr.slice(mid + 1, right + 1);
    const beforeState = [...arr];
    
    let i = 0, j = 0, k = left;
    totalMerges++;

    steps.push({
      label: `Merge [${left}-${right}]`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: Array.from({ length: mid - left + 1 }, (_, i) => left + i), shift: Array.from({ length: right - mid }, (_, i) => mid + 1 + i) },
        after: { ...createEmptyHighlights(), key: Array.from({ length: mid - left + 1 }, (_, i) => left + i), shift: Array.from({ length: right - mid }, (_, i) => mid + 1 + i) },
      },
      pointers: { left, mid, right },
      moveArrows: [],
      codeLine: 2,
      explanation: `Merging subarrays [${leftArr.join(',')}] and [${rightArr.join(',')}].`,
      metrics: { comparisons: totalComparisons, swaps: totalMerges, passes: passCount },
    });

    while (i < leftArr.length && j < rightArr.length) {
      totalComparisons++;
      
      if (leftArr[i] <= rightArr[j]) {
        arr[k] = leftArr[i];
        i++;
      } else {
        arr[k] = rightArr[j];
        j++;
      }
      k++;
    }

    while (i < leftArr.length) {
      arr[k] = leftArr[i];
      i++;
      k++;
    }

    while (j < rightArr.length) {
      arr[k] = rightArr[j];
      j++;
      k++;
    }

    steps.push({
      label: `Merged [${left}-${right}]`,
      before: beforeState,
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), compare: Array.from({ length: right - left + 1 }, (_, i) => left + i) },
        after: { ...createEmptyHighlights(), sorted: Array.from({ length: right - left + 1 }, (_, i) => left + i) },
      },
      pointers: { left, right },
      moveArrows: [],
      codeLine: 3,
      explanation: `Merged result: [${arr.slice(left, right + 1).join(',')}]. Elements are now sorted in this range.`,
      metrics: { comparisons: totalComparisons, swaps: totalMerges, passes: passCount },
    });
  }

  mergeSort(0, n - 1);

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
    explanation: `Array is now fully sorted! Total: ${totalComparisons} comparisons, ${totalMerges} merge operations.`,
    metrics: { comparisons: totalComparisons, swaps: totalMerges, passes: passCount },
  });

  return steps;
}
