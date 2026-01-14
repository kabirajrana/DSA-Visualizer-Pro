import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateBinarySearchSteps(inputArray: number[], target: number): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray].sort((a, b) => a - b);
  const n = arr.length;
  
  let totalComparisons = 0;
  let passCount = 0;
  
  let low = 0;
  let high = n - 1;
  let found = false;
  let foundIndex = -1;

  // Initial state
  steps.push({
    label: 'Initial (Sorted)',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: createEmptyHighlights(),
      after: createEmptyHighlights(),
    },
    pointers: { low: 0, high: n - 1, mid: null, target: null },
    moveArrows: [],
    codeLine: 0,
    explanation: `Searching for ${target} in sorted array. Search space: indices 0 to ${n - 1}.`,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  while (low <= high && !found) {
    passCount++;
    const mid = Math.floor((low + high) / 2);
    
    // Calculate mid
    steps.push({
      label: `Pass ${passCount}: Calculate Mid`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), compare: [mid] },
        after: { ...createEmptyHighlights(), compare: [mid] },
      },
      pointers: { low, high, mid },
      moveArrows: [],
      codeLine: 1,
      explanation: `Calculate mid = floor((${low} + ${high}) / 2) = ${mid}. arr[${mid}] = ${arr[mid]}.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

    totalComparisons++;

    if (arr[mid] === target) {
      found = true;
      foundIndex = mid;
      
      steps.push({
        label: `Pass ${passCount}: Found!`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), found: [mid] },
          after: { ...createEmptyHighlights(), found: [mid] },
        },
        pointers: { low, high, mid },
        moveArrows: [],
        codeLine: 2,
        explanation: `arr[${mid}] = ${arr[mid]} equals target ${target}. Element found!`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });
    } else if (arr[mid] < target) {
      // Show comparison result
      steps.push({
        label: `Pass ${passCount}: Compare`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [mid], shift: Array.from({ length: mid + 1 }, (_, i) => i) },
          after: { ...createEmptyHighlights(), compare: [mid], shift: Array.from({ length: mid + 1 }, (_, i) => i) },
        },
        pointers: { low, high, mid },
        moveArrows: [],
        codeLine: 3,
        explanation: `arr[${mid}] = ${arr[mid]} < ${target}. Target is in right half. Eliminate left half.`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });

      low = mid + 1;

      steps.push({
        label: `Pass ${passCount}: Narrow Right`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: createEmptyHighlights(),
          after: createEmptyHighlights(),
        },
        pointers: { low, high, mid: null },
        moveArrows: [],
        codeLine: 4,
        explanation: `Update low = ${low}. New search space: indices ${low} to ${high}.`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });
    } else {
      // Show comparison result
      steps.push({
        label: `Pass ${passCount}: Compare`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [mid], shift: Array.from({ length: n - mid }, (_, i) => mid + i) },
          after: { ...createEmptyHighlights(), compare: [mid], shift: Array.from({ length: n - mid }, (_, i) => mid + i) },
        },
        pointers: { low, high, mid },
        moveArrows: [],
        codeLine: 5,
        explanation: `arr[${mid}] = ${arr[mid]} > ${target}. Target is in left half. Eliminate right half.`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });

      high = mid - 1;

      steps.push({
        label: `Pass ${passCount}: Narrow Left`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: createEmptyHighlights(),
          after: createEmptyHighlights(),
        },
        pointers: { low, high, mid: null },
        moveArrows: [],
        codeLine: 6,
        explanation: `Update high = ${high}. New search space: indices ${low} to ${high}.`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });
    }
  }

  if (!found) {
    steps.push({
      label: 'Not Found',
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), swap: Array.from({ length: n }, (_, i) => i) },
        after: { ...createEmptyHighlights(), swap: Array.from({ length: n }, (_, i) => i) },
      },
      pointers: { low, high, mid: null },
      moveArrows: [],
      codeLine: 7,
      explanation: `Search space exhausted (low > high). Target ${target} not found in array.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });
  } else {
    steps.push({
      label: 'Complete!',
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), found: [foundIndex] },
        after: { ...createEmptyHighlights(), found: [foundIndex] },
      },
      pointers: { result: foundIndex },
      moveArrows: [],
      codeLine: 8,
      explanation: `Binary search complete! Found ${target} at index ${foundIndex} in ${totalComparisons} comparisons.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });
  }

  return steps;
}
