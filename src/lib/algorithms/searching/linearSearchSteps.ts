import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateLinearSearchSteps(inputArray: number[], target: number): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray];
  const n = arr.length;
  
  let totalComparisons = 0;
  let passCount = 0;
  let found = false;
  let foundIndex = -1;

  // Initial state
  steps.push({
    label: 'Start Search',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: createEmptyHighlights(),
      after: createEmptyHighlights(),
    },
    pointers: { i: 0, target: null },
    moveArrows: [],
    codeLine: 0,
    explanation: `Searching for ${target} in the array. We will check each element from left to right.`,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  for (let i = 0; i < n; i++) {
    passCount++;
    totalComparisons++;

    // Show comparison
    steps.push({
      label: `Check Index ${i}`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), compare: [i], eliminated: Array.from({ length: i }, (_, idx) => idx) },
        after: { ...createEmptyHighlights(), compare: [i], eliminated: Array.from({ length: i }, (_, idx) => idx) },
      },
      pointers: { i },
      moveArrows: [],
      codeLine: 1,
      explanation: `Compare arr[${i}]=${arr[i]} with target=${target}. ${arr[i] === target ? 'Match found!' : 'Not a match, continue.'}`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

    if (arr[i] === target) {
      found = true;
      foundIndex = i;

      steps.push({
        label: 'Found!',
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), found: [i] },
          after: { ...createEmptyHighlights(), found: [i] },
        },
        pointers: { result: i },
        moveArrows: [],
        codeLine: 2,
        explanation: `Target ${target} found at index ${i}!`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });
      break;
    }
  }

  if (!found) {
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
      codeLine: 3,
      explanation: `Searched entire array. Target ${target} not found after ${totalComparisons} comparisons.`,
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
      codeLine: 4,
      explanation: `Linear search complete! Found ${target} at index ${foundIndex} in ${totalComparisons} comparisons.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });
  }

  return steps;
}
