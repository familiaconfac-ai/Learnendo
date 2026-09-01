export interface SerializedSelectionRange {
  startPath: number[];
  startOffset: number;
  endPath: number[];
  endOffset: number;
}

type TreeNode = {
  childNodes: ArrayLike<TreeNode>;
  parentNode: TreeNode | null;
  nodeType?: number;
  nodeValue?: string | null;
};

export function getNodePath(root: TreeNode, target: TreeNode): number[] | null {
  if (root === target) return [];
  const path: number[] = [];
  let current: TreeNode | null = target;
  while (current && current !== root) {
    const parent: TreeNode | null = current.parentNode;
    if (!parent) return null;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    if (index < 0) return null;
    path.unshift(index);
    current = parent;
  }
  return current === root ? path : null;
}

export function resolveNodePath(root: TreeNode, path: number[]): TreeNode | null {
  let current: TreeNode = root;
  for (const index of path) {
    const child = current.childNodes[index];
    if (!child) return null;
    current = child;
  }
  return current;
}

export function clampBoundaryOffset(node: TreeNode, offset: number): number {
  const maximum = node.nodeType === 3
    ? (node.nodeValue?.length ?? 0)
    : node.childNodes.length;
  return Math.max(0, Math.min(Math.trunc(offset), maximum));
}

export function serializeDomRange(root: Node, range: Range): SerializedSelectionRange | null {
  const startPath = getNodePath(root as unknown as TreeNode, range.startContainer as unknown as TreeNode);
  const endPath = getNodePath(root as unknown as TreeNode, range.endContainer as unknown as TreeNode);
  if (!startPath || !endPath) return null;
  return {
    startPath,
    startOffset: clampBoundaryOffset(range.startContainer as unknown as TreeNode, range.startOffset),
    endPath,
    endOffset: clampBoundaryOffset(range.endContainer as unknown as TreeNode, range.endOffset),
  };
}

export function restoreDomRange(root: Node, serialized: SerializedSelectionRange): Range | null {
  if (typeof document === 'undefined') return null;
  const startNode = resolveNodePath(root as unknown as TreeNode, serialized.startPath) as unknown as Node | null;
  const endNode = resolveNodePath(root as unknown as TreeNode, serialized.endPath) as unknown as Node | null;
  if (!startNode || !endNode) return null;
  try {
    const range = document.createRange();
    range.setStart(startNode, clampBoundaryOffset(startNode as unknown as TreeNode, serialized.startOffset));
    range.setEnd(endNode, clampBoundaryOffset(endNode as unknown as TreeNode, serialized.endOffset));
    return range.collapsed ? null : range;
  } catch {
    return null;
  }
}
