import { AlgorithmType } from './stepTypes';

export interface PseudocodeLine {
  line: number;
  code: string;
  indent: number;
}

export const PSEUDOCODE: Record<AlgorithmType, PseudocodeLine[]> = {
  'bubble-sort': [
    { line: 0, code: 'for i = 0 to n-1:', indent: 0 },
    { line: 1, code: 'for j = 0 to n-i-1:', indent: 1 },
    { line: 2, code: 'if arr[j] > arr[j+1]: swap', indent: 2 },
    { line: 3, code: 'pass complete', indent: 1 },
    { line: 4, code: 'return arr', indent: 0 },
  ],
  'selection-sort': [
    { line: 0, code: 'for i = 0 to n-1:', indent: 0 },
    { line: 1, code: 'minIdx = i', indent: 1 },
    { line: 2, code: 'for j = i+1 to n:', indent: 1 },
    { line: 3, code: 'if arr[j] < arr[minIdx]: minIdx = j', indent: 2 },
    { line: 4, code: 'swap arr[i] and arr[minIdx]', indent: 1 },
    { line: 5, code: 'return arr', indent: 0 },
  ],
  'insertion-sort': [
    { line: 0, code: 'for i = 1 to n-1:', indent: 0 },
    { line: 1, code: 'key = arr[i]', indent: 1 },
    { line: 2, code: 'j = i - 1', indent: 1 },
    { line: 3, code: 'while j >= 0 and arr[j] > key:', indent: 1 },
    { line: 4, code: 'arr[j + 1] = arr[j]  // shift', indent: 2 },
    { line: 5, code: 'j = j - 1', indent: 2 },
    { line: 6, code: 'arr[j + 1] = key  // insert', indent: 1 },
    { line: 7, code: 'return arr', indent: 0 },
  ],
  'merge-sort': [
    { line: 0, code: 'mergeSort(arr, left, right):', indent: 0 },
    { line: 1, code: 'if left < right:', indent: 1 },
    { line: 2, code: 'mid = (left + right) / 2', indent: 2 },
    { line: 3, code: 'mergeSort(arr, left, mid)', indent: 2 },
    { line: 4, code: 'mergeSort(arr, mid+1, right)', indent: 2 },
    { line: 5, code: 'merge(arr, left, mid, right)', indent: 2 },
    { line: 6, code: 'return arr', indent: 0 },
  ],
  'quick-sort': [
    { line: 0, code: 'quickSort(arr, low, high):', indent: 0 },
    { line: 1, code: 'pivot = arr[high]', indent: 1 },
    { line: 2, code: 'for j = low to high-1:', indent: 1 },
    { line: 3, code: 'if arr[j] <= pivot: swap', indent: 2 },
    { line: 4, code: 'place pivot at correct position', indent: 1 },
    { line: 5, code: 'return arr', indent: 0 },
  ],
  'heap-sort': [
    { line: 0, code: 'heapSort(arr):', indent: 0 },
    { line: 1, code: 'buildMaxHeap(arr)', indent: 1 },
    { line: 2, code: 'heapify(arr, i)', indent: 2 },
    { line: 3, code: 'for i = n-1 to 0:', indent: 1 },
    { line: 4, code: 'swap arr[0] and arr[i]', indent: 2 },
    { line: 5, code: 'heapify(arr, 0, i)', indent: 2 },
    { line: 6, code: 'return arr', indent: 0 },
  ],
  'linear-search': [
    { line: 0, code: 'linearSearch(arr, target):', indent: 0 },
    { line: 1, code: 'for i = 0 to n-1:', indent: 1 },
    { line: 2, code: 'if arr[i] == target: return i', indent: 2 },
    { line: 3, code: 'continue', indent: 2 },
    { line: 4, code: 'return -1  // not found', indent: 0 },
  ],
  'binary-search': [
    { line: 0, code: 'low = 0, high = n - 1', indent: 0 },
    { line: 1, code: 'while low <= high:', indent: 0 },
    { line: 2, code: 'mid = (low + high) / 2', indent: 1 },
    { line: 3, code: 'if arr[mid] == target:', indent: 1 },
    { line: 4, code: 'return mid  // found!', indent: 2 },
    { line: 5, code: 'else if arr[mid] < target:', indent: 1 },
    { line: 6, code: 'low = mid + 1', indent: 2 },
    { line: 7, code: 'else:', indent: 1 },
    { line: 8, code: 'high = mid - 1', indent: 2 },
    { line: 9, code: 'return -1  // not found', indent: 0 },
  ],
  'jump-search': [
    { line: 0, code: 'jumpSearch(arr, target):', indent: 0 },
    { line: 1, code: 'step = √n', indent: 1 },
    { line: 2, code: 'while arr[min(step, n)-1] < target:', indent: 1 },
    { line: 3, code: 'prev = step, step += √n', indent: 2 },
    { line: 4, code: 'linear search from prev', indent: 1 },
    { line: 5, code: 'if arr[prev] == target: return prev', indent: 2 },
    { line: 6, code: 'return -1  // not found', indent: 0 },
  ],
  'interpolation-search': [
    { line: 0, code: 'interpolationSearch(arr, target):', indent: 0 },
    { line: 1, code: 'pos = low + ((target-arr[low])*(high-low))/(arr[high]-arr[low])', indent: 1 },
    { line: 2, code: 'if arr[pos] == target: return pos', indent: 1 },
    { line: 3, code: 'if arr[pos] < target: low = pos + 1', indent: 1 },
    { line: 4, code: 'else: high = pos - 1', indent: 1 },
    { line: 5, code: 'found at pos', indent: 1 },
    { line: 6, code: 'complete', indent: 0 },
    { line: 7, code: 'return -1  // not found', indent: 0 },
  ],
};

// Map step codeLine to actual pseudocode line for better highlighting
export const CODE_LINE_MAPPING: Record<AlgorithmType, Record<number, number>> = {
  'bubble-sort': {
    0: 0, 1: 2, 2: 2, 3: 3, 4: 4,
  },
  'selection-sort': {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
  },
  'insertion-sort': {
    0: 0, 1: 1, 2: 3, 3: 4, 4: 6, 5: 7,
  },
  'merge-sort': {
    0: 0, 1: 2, 2: 5, 3: 5, 4: 6,
  },
  'quick-sort': {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5,
  },
  'heap-sort': {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6,
  },
  'linear-search': {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4,
  },
  'binary-search': {
    0: 0, 1: 2, 2: 4, 3: 5, 4: 6, 5: 7, 6: 8, 7: 9, 8: 4,
  },
  'jump-search': {
    0: 0, 1: 2, 2: 3, 3: 4, 4: 5, 5: 5, 6: 6,
  },
  'interpolation-search': {
    0: 0, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7,
  },
};
