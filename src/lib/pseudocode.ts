import { AlgorithmType } from './stepTypes';

export interface PseudocodeLine {
  line: number;
  code: string;
  indent: number;
}

export const PSEUDOCODE: Record<AlgorithmType, PseudocodeLine[]> = {
  'bubble-sort': [
    { line: 0, code: 'for i in range(n - 1):', indent: 0 },
    { line: 1, code: 'for j in range(n - i - 1):', indent: 1 },
    { line: 2, code: 'if arr[j] > arr[j + 1]:', indent: 2 },
    { line: 3, code: 'arr[j], arr[j + 1] = arr[j + 1], arr[j]', indent: 3 },
    { line: 4, code: 'return arr', indent: 0 },
  ],
  'selection-sort': [
    { line: 0, code: 'for i in range(n - 1):', indent: 0 },
    { line: 1, code: 'min_idx = i', indent: 1 },
    { line: 2, code: 'for j in range(i + 1, n):', indent: 1 },
    { line: 3, code: 'if arr[j] < arr[min_idx]:', indent: 2 },
    { line: 4, code: 'min_idx = j', indent: 3 },
    { line: 5, code: 'arr[i], arr[min_idx] = arr[min_idx], arr[i]', indent: 1 },
  ],
  'insertion-sort': [
    { line: 0, code: 'for i in range(1, n):', indent: 0 },
    { line: 1, code: 'key = arr[i]', indent: 1 },
    { line: 2, code: 'j = i - 1', indent: 1 },
    { line: 3, code: 'while j >= 0 and arr[j] > key:', indent: 1 },
    { line: 4, code: 'arr[j + 1] = arr[j]  # shift', indent: 2 },
    { line: 5, code: 'j -= 1', indent: 2 },
    { line: 6, code: 'arr[j + 1] = key', indent: 1 },
    { line: 7, code: 'return arr', indent: 0 },
  ],
  'merge-sort': [
    { line: 0, code: 'def merge_sort(arr):', indent: 0 },
    { line: 1, code: 'if len(arr) <= 1:', indent: 1 },
    { line: 2, code: 'return arr', indent: 2 },
    { line: 3, code: 'mid = len(arr) // 2', indent: 1 },
    { line: 4, code: 'left = merge_sort(arr[:mid])', indent: 1 },
    { line: 5, code: 'right = merge_sort(arr[mid:])', indent: 1 },
    { line: 6, code: 'return merge(left, right)', indent: 1 },
  ],
  'quick-sort': [
    { line: 0, code: 'def quick_sort(arr, low, high):', indent: 0 },
    { line: 1, code: 'pivot = arr[high]', indent: 1 },
    { line: 2, code: 'for j in range(low, high):', indent: 1 },
    { line: 3, code: 'if arr[j] <= pivot:', indent: 2 },
    { line: 4, code: 'arr[i], arr[j] = arr[j], arr[i]', indent: 3 },
    { line: 5, code: 'return arr', indent: 0 },
  ],
  'heap-sort': [
    { line: 0, code: 'def heap_sort(arr):', indent: 0 },
    { line: 1, code: 'build_max_heap(arr)', indent: 1 },
    { line: 2, code: 'for i in range(n - 1, 0, -1):', indent: 1 },
    { line: 3, code: 'arr[0], arr[i] = arr[i], arr[0]', indent: 2 },
    { line: 4, code: 'heapify(arr, i, 0)', indent: 2 },
    { line: 5, code: 'return arr', indent: 1 },
    { line: 6, code: '# helper: heapify()', indent: 0 },
  ],
  'linear-search': [
    { line: 0, code: 'def linear_search(arr, target):', indent: 0 },
    { line: 1, code: 'for i in range(len(arr)):', indent: 1 },
    { line: 2, code: 'if arr[i] == target:', indent: 2 },
    { line: 3, code: 'return i', indent: 3 },
    { line: 4, code: 'return -1  # not found', indent: 0 },
  ],
  'binary-search': [
    { line: 0, code: 'low = 0', indent: 0 },
    { line: 1, code: 'high = len(arr) - 1', indent: 0 },
    { line: 2, code: 'while low <= high:', indent: 0 },
    { line: 3, code: 'mid = (low + high) // 2', indent: 1 },
    { line: 4, code: 'if arr[mid] == target:', indent: 1 },
    { line: 5, code: 'return mid', indent: 2 },
    { line: 6, code: 'elif arr[mid] < target:', indent: 1 },
    { line: 7, code: 'low = mid + 1', indent: 2 },
    { line: 8, code: 'else:', indent: 1 },
    { line: 9, code: 'high = mid - 1', indent: 2 },
  ],
  'jump-search': [
    { line: 0, code: 'import math', indent: 0 },
    { line: 1, code: 'step = int(math.sqrt(n))', indent: 0 },
    { line: 2, code: 'while prev < n and arr[min(step, n) - 1] < target:', indent: 0 },
    { line: 3, code: 'prev = step', indent: 1 },
    { line: 4, code: 'step += int(math.sqrt(n))', indent: 1 },
    { line: 5, code: 'for i in range(prev, min(step, n)):', indent: 0 },
    { line: 6, code: 'if arr[i] == target: return i', indent: 1 },
  ],
  'interpolation-search': [
    { line: 0, code: 'while low <= high and arr[low] <= target <= arr[high]:', indent: 0 },
    { line: 1, code: 'pos = low + int(((target - arr[low]) * (high - low)) / (arr[high] - arr[low]))', indent: 1 },
    { line: 2, code: 'if arr[pos] == target: return pos', indent: 1 },
    { line: 3, code: 'if arr[pos] < target: low = pos + 1', indent: 1 },
    { line: 4, code: 'else: high = pos - 1', indent: 1 },
    { line: 5, code: '# probe again', indent: 1 },
    { line: 6, code: 'return -1', indent: 0 },
    { line: 7, code: '# not found', indent: 0 },
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
