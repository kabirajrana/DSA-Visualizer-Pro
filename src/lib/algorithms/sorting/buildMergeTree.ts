export type TreeNode = {
  id: string;
  values: number[];
  left?: TreeNode;
  right?: TreeNode;
  merged?: number[];
};

const mergeSorted = (a: number[], b: number[]): number[] => {
  const out: number[] = [];
  let i = 0;
  let j = 0;

  while (i < a.length && j < b.length) {
    if (a[i] <= b[j]) {
      out.push(a[i]);
      i++;
    } else {
      out.push(b[j]);
      j++;
    }
  }

  while (i < a.length) {
    out.push(a[i]);
    i++;
  }

  while (j < b.length) {
    out.push(b[j]);
    j++;
  }

  return out;
};

export function buildMergeTree(values: number[]): TreeNode {
  const source = [...values];

  const build = (segment: number[], path: string): TreeNode => {
    if (segment.length <= 1) {
      return { id: path, values: [...segment] };
    }

    const mid = Math.floor(segment.length / 2);
    const leftSeg = segment.slice(0, mid);
    const rightSeg = segment.slice(mid);

    const left = build(leftSeg, `${path}L`);
    const right = build(rightSeg, `${path}R`);

    const leftSorted = left.merged ?? left.values;
    const rightSorted = right.merged ?? right.values;

    return {
      id: path,
      values: [...segment],
      left,
      right,
      merged: mergeSorted(leftSorted, rightSorted),
    };
  };

  return build(source, 'R');
}
