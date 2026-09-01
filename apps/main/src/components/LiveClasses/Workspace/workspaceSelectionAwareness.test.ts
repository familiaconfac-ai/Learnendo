import assert from 'node:assert/strict';
import {
  clampBoundaryOffset,
  getNodePath,
  isSerializedRangeCollapsed,
  resolveNodePath,
  restoreScrollTop,
  serializeScrollRatio,
} from './workspaceSelectionAwareness.ts';

type FakeNode = {
  childNodes: FakeNode[];
  parentNode: FakeNode | null;
  nodeType?: number;
  nodeValue?: string;
};

const element = (...children: FakeNode[]): FakeNode => {
  const node: FakeNode = { childNodes: children, parentNode: null, nodeType: 1 };
  children.forEach((child) => { child.parentNode = node; });
  return node;
};
const text = (value: string): FakeNode => ({ childNodes: [], parentNode: null, nodeType: 3, nodeValue: value });

const word = text('Letters');
const separator = text(' and ');
const phraseEnd = text('Numbers');
const paragraph = element(word, separator, phraseEnd);
const root = element(paragraph);

assert.deepEqual(getNodePath(root, word), [0, 0], 'serializes the selected word node');
assert.deepEqual(getNodePath(root, phraseEnd), [0, 2], 'serializes the end of a phrase');
assert.equal(resolveNodePath(root, [0, 0]), word, 'reconstructs the word boundary');
assert.equal(resolveNodePath(root, [0, 2]), phraseEnd, 'reconstructs the phrase boundary');
assert.equal(resolveNodePath(root, [1]), null, 'a selection is cleared when its page DOM no longer matches');
assert.equal(clampBoundaryOffset(word, 7), 7);
assert.equal(clampBoundaryOffset(word, 99), 7, 'stale offsets cannot escape the text node');
assert.equal(clampBoundaryOffset(paragraph, 99), 3, 'element offsets are bounded by child count');
assert.equal(isSerializedRangeCollapsed({ startPath: [0, 0], startOffset: 3, endPath: [0, 0], endOffset: 3 }), true,
  'recognizes a serialized caret');
assert.equal(isSerializedRangeCollapsed({ startPath: [0, 0], startOffset: 0, endPath: [0, 0], endOffset: 7 }), false,
  'keeps a non-collapsed selection');
assert.equal(serializeScrollRatio(450, 1100, 200), 0.5, 'serializes logical scroll position');
assert.equal(restoreScrollTop(0.5, 600, 100), 250, 'restores the same logical region in another viewport');
assert.equal(restoreScrollTop(2, 600, 100), 500, 'clamps remote scroll ratios');

console.log('workspace selection awareness tests passed');
