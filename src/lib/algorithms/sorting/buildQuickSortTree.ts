export type QuickNodeKind = 'root' | 'partition' | 'leaf';

export type QuickTreeNode = {
  id: string;
  values: number[];
  pivotValue: number;
  leftValues: number[];
  rightValues: number[];
  left?: QuickTreeNode;
  right?: QuickTreeNode;
  kind: QuickNodeKind;
};

// Back-compat alias for earlier work-in-progress code.
export type QuickNode = QuickTreeNode;

export type QuickSortTree = {
  root: QuickTreeNode;
  sortedValues: number[];
};

/**
 * Builds a recursion/partition tree that matches the app's Quick Sort implementation.
 * Pivot strategy: Lomuto partition with pivot = arr[high] (last element).
 * Pure function: does not mutate input.
 */
export function buildQuickSortTree(inputArray: number[]): QuickSortTree {
  const arr = [...inputArray];
  const n = arr.length;

  let idCounter = 0;
  const nextId = (prefix: string) => `${prefix}-${idCounter++}`;

  const swap = (i: number, j: number) => {
    const t = arr[i];
    arr[i] = arr[j];
    arr[j] = t;
  };

  const partition = (low: number, high: number) => {
    const pivot = arr[high];
    let i = low - 1;
    for (let j = low; j < high; j++) {
      if (arr[j] <= pivot) {
        i++;
        swap(i, j);
      }
    }
    swap(i + 1, high);
    return i + 1;
  };

  const build = (low: number, high: number, kind: QuickNodeKind, path: string): QuickTreeNode => {
    const values = arr.slice(low, high + 1);

    // Leaf node: no partition happens.
    if (values.length <= 1) {
      return {
        id: nextId(path),
        values,
        pivotValue: values[0] ?? 0,
        leftValues: [],
        rightValues: [],
        kind: 'leaf',
      };
    }

    // IMPORTANT: matches the app's step engine.
    // Lomuto partition with pivot = arr[high], and comparison is: arr[j] <= pivot.
    const pivotValue = arr[high];
    const p = partition(low, high);

    // After partition, pivot is at index p.
    const leftValues = arr.slice(low, p); // <= pivot
    const rightValues = arr.slice(p + 1, high + 1); // > pivot

    const node: QuickTreeNode = {
      id: nextId(path),
      values,
      pivotValue,
      leftValues,
      rightValues,
      kind,
    };

    if (p - 1 >= low) node.left = build(low, p - 1, 'partition', `${path}L`);
    if (p + 1 <= high) node.right = build(p + 1, high, 'partition', `${path}R`);

    return node;
  };

  const root: QuickTreeNode =
    n === 0
      ? { id: nextId('Q'), values: [], pivotValue: 0, leftValues: [], rightValues: [], kind: 'root' }
      : build(0, n - 1, 'root', 'Q');

  // `arr` has been sorted as a byproduct of building the recursion tree.
  const sortedValues = [...arr];

  return { root, sortedValues };
}
