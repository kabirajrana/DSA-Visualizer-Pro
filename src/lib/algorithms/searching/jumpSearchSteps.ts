import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateJumpSearchSteps(inputArray: number[], target: number): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray].sort((a, b) => a - b);
  const n = arr.length;
  
  let totalComparisons = 0;
  let passCount = 0;
  let found = false;
  let foundIndex = -1;

  const jump = Math.floor(Math.sqrt(n));

  // Initial state
  steps.push({
    label: 'Start Search',
    before: [...arr],
    after: [...arr],
    highlights: {
      before: createEmptyHighlights(),
      after: createEmptyHighlights(),
    },
    pointers: { step: 0, jump: jump },
    moveArrows: [],
    codeLine: 0,
    explanation: `Searching for ${target} using Jump Search. Jump size = √${n} ≈ ${jump}. Array is sorted.`,
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  let prev = 0;
  let curr = 0;

  // Jump phase
  while (curr < n && arr[Math.min(curr, n - 1)] < target) {
    passCount++;
    totalComparisons++;
    const checkIdx = Math.min(curr, n - 1);

    steps.push({
      label: `Jump to ${checkIdx}`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), compare: [checkIdx], eliminated: Array.from({ length: prev }, (_, i) => i) },
        after: { ...createEmptyHighlights(), compare: [checkIdx], eliminated: Array.from({ length: prev }, (_, i) => i) },
      },
      pointers: { curr: checkIdx, prev },
      moveArrows: [],
      codeLine: 1,
      explanation: `Check arr[${checkIdx}]=${arr[checkIdx]}. ${arr[checkIdx] < target ? `Less than ${target}, jump forward.` : `Greater or equal to ${target}, stop jumping.`}`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

    prev = curr;
    curr += jump;
  }

  // Linear search phase
  if (curr >= n || arr[Math.min(curr, n - 1)] >= target) {
    steps.push({
      label: 'Linear Search Phase',
      before: [...arr],
      after: [...arr],
      highlights: {
        before: { ...createEmptyHighlights(), key: Array.from({ length: Math.min(curr, n) - prev }, (_, i) => prev + i), eliminated: Array.from({ length: prev }, (_, i) => i) },
        after: { ...createEmptyHighlights(), key: Array.from({ length: Math.min(curr, n) - prev }, (_, i) => prev + i), eliminated: Array.from({ length: prev }, (_, i) => i) },
      },
      pointers: { start: prev, end: Math.min(curr, n - 1) },
      moveArrows: [],
      codeLine: 2,
      explanation: `Target might be in range [${prev}...${Math.min(curr, n - 1)}]. Starting linear search backwards.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });

    for (let i = prev; i < Math.min(curr, n); i++) {
      passCount++;
      totalComparisons++;

      steps.push({
        label: `Check Index ${i}`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: { ...createEmptyHighlights(), compare: [i], eliminated: Array.from({ length: prev }, (_, idx) => idx) },
          after: { ...createEmptyHighlights(), compare: [i], eliminated: Array.from({ length: prev }, (_, idx) => idx) },
        },
        pointers: { i },
        moveArrows: [],
        codeLine: 3,
        explanation: `Compare arr[${i}]=${arr[i]} with target=${target}. ${arr[i] === target ? 'Match found!' : arr[i] > target ? 'Greater than target, stop.' : 'Continue searching.'}`,
        metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
      });

      if (arr[i] === target) {
        found = true;
        foundIndex = i;
        break;
      } else if (arr[i] > target) {
        break;
      }
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
      codeLine: 4,
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
      codeLine: 5,
      explanation: `Jump search complete! Found ${target} at index ${foundIndex} in ${totalComparisons} comparisons.`,
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
      codeLine: 6,
      explanation: `Jump search complete. Target ${target} not found after ${totalComparisons} comparisons.`,
      metrics: { comparisons: totalComparisons, swaps: 0, passes: passCount },
    });
  }

  return steps;
}
