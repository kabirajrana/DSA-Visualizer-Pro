import { AlgorithmType } from './stepTypes';

export interface PseudocodeLine {
  line: number;
  code: string;
  indent: number;
}

export const PSEUDOCODE: Record<AlgorithmType, PseudocodeLine[]> = {
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
};

// Map step codeLine to actual pseudocode line for better highlighting
export const CODE_LINE_MAPPING: Record<AlgorithmType, Record<number, number>> = {
  'insertion-sort': {
    0: 0,  // Initial - for loop
    1: 1,  // Pick key
    2: 3,  // Compare (while condition)
    3: 4,  // Shift
    4: 6,  // Insert
    5: 7,  // Return
  },
  'binary-search': {
    0: 0,  // Initial
    1: 2,  // Calculate mid
    2: 4,  // Found
    3: 5,  // arr[mid] < target
    4: 6,  // low = mid + 1
    5: 7,  // arr[mid] > target
    6: 8,  // high = mid - 1
    7: 9,  // Not found
    8: 4,  // Complete/found
  },
};
