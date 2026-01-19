import { Step, createEmptyHighlights } from '@/lib/stepTypes';

export function generateQuickSortSteps(inputArray: number[]): Step[] {
  const steps: Step[] = [];
  const arr = [...inputArray];
  const n = arr.length;
  
  let totalComparisons = 0;
  let totalSwaps = 0;
  const fixedPivots = new Set<number>();

  // 0-based line indices for the *exact* debugger Python code (see src/lib/algorithmCode.ts).
  const L = {
    PARTITION_DEF: 0,
    PIVOT_ASSIGN: 1,
    I_INIT: 2,
    FOR_J: 4,
    IF_CMP: 5,
    I_INC: 6,
    SWAP_IJ: 7,
    PIVOT_SWAP: 9,
    RETURN_PI: 10,
    QUICK_SORT_DEF: 13,
    IF_LOW_LT_HIGH: 14,
    CALL_PARTITION: 15,
    RECURSE_LEFT: 16,
    RECURSE_RIGHT: 17,
  } as const;

  const indices = Array.from({ length: n }, (_, i) => i);

  const eliminatedOutsideActiveRange = (low: number | null, high: number | null): number[] => {
    if (low == null || high == null) {
      return indices.filter((idx) => !fixedPivots.has(idx));
    }
    if (low > high) {
      // Empty active range (base-case). Keep fixed pivots visible.
      return indices.filter((idx) => !fixedPivots.has(idx));
    }
    return indices.filter((idx) => (idx < low || idx > high) && !fixedPivots.has(idx));
  };

  const fixedPivotHighlights = (): number[] => Array.from(fixedPivots.values()).sort((a, b) => a - b);

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
    codeLine: -1,
    explanation: 'Starting Quick Sort. We pick a pivot, partition array around it, then sort sub-arrays recursively.',
    metrics: { comparisons: 0, swaps: 0, passes: 0 },
  });

  function quickSort(low: number, high: number): void {
    if (low < high) {
      const pivotIndex = partition(low, high);

      // IMPORTANT: execute left recursion fully before right recursion (matches Python).
      // Visual rule: only one subarray is active at a time; everything else is dimmed/frozen.
      steps.push({
        label: 'Recursive Call (Left)',
        before: [...arr],
        after: [...arr],
        highlights: {
          before: {
            ...createEmptyHighlights(),
            sorted: fixedPivotHighlights(),
            eliminated: eliminatedOutsideActiveRange(low, pivotIndex - 1),
          },
          after: {
            ...createEmptyHighlights(),
            sorted: fixedPivotHighlights(),
            eliminated: eliminatedOutsideActiveRange(low, pivotIndex - 1),
          },
        },
        pointers: { low, high: pivotIndex - 1, i: null, j: null, pivot: null },
        moveArrows: [],
        codeLine: L.RECURSE_LEFT,
        explanation: `Executing quick_sort(arr, low, pivot_index - 1). Active subarray is [${low}..${pivotIndex - 1}] (others are frozen).`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
      });
      quickSort(low, pivotIndex - 1);

      steps.push({
        label: 'Recursive Call (Right)',
        before: [...arr],
        after: [...arr],
        highlights: {
          before: {
            ...createEmptyHighlights(),
            sorted: fixedPivotHighlights(),
            eliminated: eliminatedOutsideActiveRange(pivotIndex + 1, high),
          },
          after: {
            ...createEmptyHighlights(),
            sorted: fixedPivotHighlights(),
            eliminated: eliminatedOutsideActiveRange(pivotIndex + 1, high),
          },
        },
        pointers: { low: pivotIndex + 1, high, i: null, j: null, pivot: null },
        moveArrows: [],
        codeLine: L.RECURSE_RIGHT,
        explanation: `Executing quick_sort(arr, pivot_index + 1, high). Active subarray is [${pivotIndex + 1}..${high}] (others are frozen).`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
      });
      quickSort(pivotIndex + 1, high);
    }
  }

  function partition(low: number, high: number): number {
    const pivot = arr[high];
    let i = low - 1;

    const eliminated = eliminatedOutsideActiveRange(low, high);

    // Partition setup: pivot is ALWAYS arr[high] and does NOT move during comparisons.
    steps.push({
      label: `Partition Setup`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: {
          ...createEmptyHighlights(),
          pivot: [high],
          sorted: fixedPivotHighlights(),
          eliminated,
        },
        after: {
          ...createEmptyHighlights(),
          pivot: [high],
          sorted: fixedPivotHighlights(),
          eliminated,
        },
      },
      pointers: { low, high, pivot: high, i },
      moveArrows: [],
      codeLine: L.PIVOT_ASSIGN,
      explanation: `Entering partition(arr, low=${low}, high=${high}). Set pivot = arr[high] = ${pivot} and i = low - 1 = ${i}. Only this subarray is active.`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
    });

    for (let j = low; j < high; j++) {
      totalComparisons++;
      
      // Compare with pivot (executes: if arr[j] <= pivot)
      steps.push({
        label: `Compare with Pivot`,
        before: [...arr],
        after: [...arr],
        highlights: {
          before: {
            ...createEmptyHighlights(),
            compare: [j],
            pivot: [high],
            sorted: fixedPivotHighlights(),
            eliminated,
          },
          after: {
            ...createEmptyHighlights(),
            compare: [j],
            pivot: [high],
            sorted: fixedPivotHighlights(),
            eliminated,
          },
        },
        pointers: { low, high, pivot: high, i, j },
        moveArrows: [{ fromIndex: j, toIndex: high, type: 'compare' }],
        codeLine: L.IF_CMP,
        explanation: `Executing if arr[j] <= pivot. Compare arr[${j}] = ${arr[j]} with pivot (arr[${high}]) = ${pivot}. ${arr[j] <= pivot ? 'Condition is TRUE (<=), so we will increment i and swap.' : 'Condition is FALSE (>), so we will not swap; only j moves forward.'}`,
        metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
      });

      if (arr[j] <= pivot) {
        const prevI = i;
        i++;
        const beforeState = [...arr];
        const a = arr[i];
        const b = arr[j];
        // Python executes the swap statement even if i === j.
        arr[i] = b;
        arr[j] = a;
        totalSwaps++;

        steps.push({
          label: `Swap`,
          before: beforeState,
          after: [...arr],
          highlights: {
            before: {
              ...createEmptyHighlights(),
              swap: i === j ? [i] : [i, j],
              pivot: [high],
              sorted: fixedPivotHighlights(),
              eliminated,
            },
            after: {
              ...createEmptyHighlights(),
              swap: i === j ? [i] : [i, j],
              pivot: [high],
              sorted: fixedPivotHighlights(),
              eliminated,
            },
          },
          pointers: { low, high, pivot: high, i, j },
          moveArrows: i === j ? [] : [{ fromIndex: i, toIndex: j, type: 'swap' }],
          codeLine: L.SWAP_IJ,
          explanation: `Condition was TRUE (arr[${j}] <= pivot). i moved from ${prevI} to ${i} (executing i += 1), then we execute arr[i], arr[j] = arr[j], arr[i]. ${i === j ? `This swaps index ${i} with itself (no visible change), but the swap statement still executed.` : `Swapped indices ${i} and ${j} to move the <= pivot element into the left partition.`}`,
          metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
        });
      } else {
        steps.push({
          label: `No Swap / Skip`,
          before: [...arr],
          after: [...arr],
          highlights: {
            before: {
              ...createEmptyHighlights(),
              compare: [j],
              pivot: [high],
              sorted: fixedPivotHighlights(),
              eliminated,
            },
            after: {
              ...createEmptyHighlights(),
              compare: [j],
              pivot: [high],
              sorted: fixedPivotHighlights(),
              eliminated,
            },
          },
          pointers: { low, high, pivot: high, i, j },
          moveArrows: [],
          codeLine: L.IF_CMP,
          explanation: `Condition was FALSE (arr[${j}] > pivot), so the code does NOT execute i += 1 and does NOT swap. i stays at ${i}. Next, j advances to the next index in the for-loop.`,
          metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
        });
      }
    }

    // Pivot placement happens ONLY after the loop ends (matches Lomuto).
    const pivotFinalIndex = i + 1;

    steps.push({
      label: `Pivot Placement`,
      before: [...arr],
      after: [...arr],
      highlights: {
        before: {
          ...createEmptyHighlights(),
          swap: pivotFinalIndex === high ? [high] : [pivotFinalIndex, high],
          pivot: [high],
          sorted: fixedPivotHighlights(),
          eliminated,
        },
        after: {
          ...createEmptyHighlights(),
          swap: pivotFinalIndex === high ? [high] : [pivotFinalIndex, high],
          pivot: [high],
          sorted: fixedPivotHighlights(),
          eliminated,
        },
      },
      pointers: { low, high, pivot: high, i, j: null },
      moveArrows: pivotFinalIndex === high ? [] : [{ fromIndex: high, toIndex: pivotFinalIndex, type: 'swap' }],
      codeLine: L.PIVOT_SWAP,
      explanation: `The for-loop is finished. Now execute arr[i + 1], arr[high] = arr[high], arr[i + 1] to place the pivot. Pivot (${pivot}) moves from index ${high} to index ${pivotFinalIndex}.`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
    });

    const beforePivotSwap = [...arr];
    const tmp = arr[pivotFinalIndex];
    arr[pivotFinalIndex] = arr[high];
    arr[high] = tmp;
    totalSwaps++;
    fixedPivots.add(pivotFinalIndex);

    steps.push({
      label: `Pivot Placement`,
      before: beforePivotSwap,
      after: [...arr],
      highlights: {
        before: {
          ...createEmptyHighlights(),
          swap: pivotFinalIndex === high ? [high] : [pivotFinalIndex, high],
          pivot: [high],
          sorted: fixedPivotHighlights().filter((x) => x !== pivotFinalIndex),
          eliminated,
        },
        after: {
          ...createEmptyHighlights(),
          sorted: fixedPivotHighlights(),
          eliminated,
        },
      },
      pointers: { low, high, pivot: pivotFinalIndex, i, j: null },
      moveArrows: pivotFinalIndex === high ? [] : [{ fromIndex: high, toIndex: pivotFinalIndex, type: 'swap' }],
      codeLine: L.PIVOT_SWAP,
      explanation: `Pivot placement swap executed. Index ${pivotFinalIndex} is now fixed (correct position for pivot ${pivot}). IMPORTANT: only this pivot is guaranteed correct; the left and right subarrays may still be unsorted until their recursive calls run.`,
      metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
    });

    return pivotFinalIndex;
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
    codeLine: -1,
    explanation: `Array is now fully sorted! Total: ${totalComparisons} comparisons, ${totalSwaps} swaps.`,
    metrics: { comparisons: totalComparisons, swaps: totalSwaps, passes: 0 },
  });

  return steps;
}
