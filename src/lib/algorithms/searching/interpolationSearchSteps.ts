import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateInterpolationSearchSteps(inputArray: number[], target: number): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray].sort((a, b) => a - b);
  const n = arr.length;
  
  let totalComparisons = 0;
  let passCount = 0;
  let found = false;
  let foundIndex = -1;

  let low = 0;
  let high = n - 1;

  // Initial state
  steps.push({
    label: 'Start Search',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: createEmptyHighlights(),
      after: createEmptyHighlights(),
    },
    pointers: { low: 0, high: n - 1 },
    moveArrows: [],
    codeLine: 0,
    explanation: `Searching for ${target} using Interpolation Search. Uses value-based position estimation. Array is sorted.`,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  while (low <= high && target >= arr[low] && target <= arr[high]) {
    passCount++;
    
    // Calculate position using interpolation formula
    let pos: number;
    if (arr[high] === arr[low]) {
      pos = low;
    } else {
      pos = low + Math.floor(((target - arr[low]) * (high - low)) / (arr[high] - arr[low]));
    }
    pos = Math.min(Math.max(pos, low), high); // Ensure pos is within bounds

    steps.push({
      label: `Calculate Position`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: [pos] },
        after: { ...createEmptyHighlights(), key: [pos] },
      },
      pointers: { low, high, pos },
      moveArrows: [],
      codeLine: 1,
      explanation: `Estimated position = ${pos}. Formula: low + ((target - arr[low]) × (high - low)) / (arr[high] - arr[low])`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

    totalComparisons++;

    steps.push({
      label: `Compare at ${pos}`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), compare: [pos] },
        after: { ...createEmptyHighlights(), compare: [pos] },
      },
      pointers: { low, high, pos },
      moveArrows: [],
      codeLine: 2,
      explanation: `Compare arr[${pos}]=${arr[pos]} with target=${target}. ${arr[pos] === target ? 'Match!' : arr[pos] < target ? 'Less, search right.' : 'Greater, search left.'}`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

    if (arr[pos] === target) {
      found = true;
      foundIndex = pos;
      break;
    }

    if (arr[pos] < target) {
      const eliminated = Array.from({ length: pos - low + 1 }, (_, i) => low + i);
      low = pos + 1;

      steps.push({
        label: `Narrow Right`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), eliminated },
          after: { ...createEmptyHighlights(), eliminated },
        },
        pointers: { low, high },
        moveArrows: [],
        codeLine: 3,
        explanation: `arr[${pos}]=${arr[pos]} < ${target}. Update low = ${low}. Search in [${low}...${high}].`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });
    } else {
      const eliminated = Array.from({ length: high - pos + 1 }, (_, i) => pos + i);
      high = pos - 1;

      steps.push({
        label: `Narrow Left`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), eliminated },
          after: { ...createEmptyHighlights(), eliminated },
        },
        pointers: { low, high },
        moveArrows: [],
        codeLine: 4,
        explanation: `arr[${pos}]=${arr[pos]} > ${target}. Update high = ${high}. Search in [${low}...${high}].`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });
    }
  }

  if (found) {
    steps.push({
      label: 'Found!',
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), found: [foundIndex] },
        after: { ...createEmptyHighlights(), found: [foundIndex] },
      },
      pointers: { result: foundIndex },
      moveArrows: [],
      codeLine: 5,
      explanation: `Target ${target} found at index ${foundIndex}!`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

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
      codeLine: 6,
      explanation: `Interpolation search complete! Found ${target} at index ${foundIndex} in ${totalComparisons} comparisons.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });
  } else {
    steps.push({
      label: 'Not Found',
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), eliminated: Array.from({ length: n }, (_, i) => i) },
        after: { ...createEmptyHighlights(), eliminated: Array.from({ length: n }, (_, i) => i) },
      },
      pointers: {},
      moveArrows: [],
      codeLine: 7,
      explanation: `Interpolation search complete. Target ${target} not found after ${totalComparisons} comparisons.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });
  }

  return steps;
}
