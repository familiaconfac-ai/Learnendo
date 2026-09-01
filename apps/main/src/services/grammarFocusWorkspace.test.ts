import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderGrammarFocusWorkspaceHtml, resolveLegacyWorkspaceSurfaceState } from './grammarFocusWorkspace';

const html = renderGrammarFocusWorkspaceHtml('English — Letters and Numbers', [
  '# Alphabet',
  '',
  'Practice **capital letters** and *small letters*.',
  '',
  '- A',
  '- B',
  '',
  '1. One',
  '2. Two',
  '',
  '> Example: A is the first letter.',
].join('\n'));

assert.match(html, /<h1>English — Letters and Numbers<\/h1>/);
assert.match(html, /<h2>Alphabet<\/h2>/);
assert.match(html, /<strong>capital letters<\/strong>/);
assert.match(html, /<em>small letters<\/em>/);
assert.match(html, /<ul><li>A<\/li><li>B<\/li><\/ul>/);
assert.match(html, /<ol><li>One<\/li><li>Two<\/li><\/ol>/);
assert.match(html, /<blockquote>A is the first letter\.<\/blockquote>/);
assert.doesNotMatch(renderGrammarFocusWorkspaceHtml('<script>', '<img src=x>'), /<script>|<img/);

const legacyBoardPage = {
  id: 'legacy-board',
  name: 'Existing Board',
  backgroundColor: '#ffffff',
  docContent: '<p>Keep this board</p>',
  items: [],
};
assert.deepEqual(resolveLegacyWorkspaceSurfaceState({
  surfaceMode: 'document',
  pages: [legacyBoardPage],
  currentPageId: legacyBoardPage.id,
  docContent: legacyBoardPage.docContent,
  items: legacyBoardPage.items,
}, 'document'), {
  pages: [legacyBoardPage],
  currentPageId: legacyBoardPage.id,
  docContent: legacyBoardPage.docContent,
  items: legacyBoardPage.items,
}, 'sending Grammar Focus to Slides must preserve a legacy Board before switching surfaces');
assert.equal(resolveLegacyWorkspaceSurfaceState({
  surfaceMode: 'document',
  boardState: {
    pages: [legacyBoardPage],
    currentPageId: legacyBoardPage.id,
    docContent: legacyBoardPage.docContent,
    items: [],
  },
  pages: [legacyBoardPage],
}, 'document'), null, 'an existing dedicated surface must not be replaced from legacy top-level fields');

const grammarModal = readFileSync(resolve(process.cwd(), 'src/components/GrammarFocus/GrammarFocusModal.tsx'), 'utf8');
const workspaceCanvas = readFileSync(resolve(process.cwd(), 'src/components/LiveClasses/Workspace/WorkspaceCanvas.tsx'), 'utf8');
const app = readFileSync(resolve(process.cwd(), 'src/App.tsx'), 'utf8');
assert.match(grammarModal, /:\s*'Board'/, 'Grammar Focus must provide a direct Board action');
assert.match(grammarModal, /:\s*'Slides'/, 'Grammar Focus must provide a direct Slides action');
assert.match(grammarModal, />Practice</, 'Grammar Focus must provide a direct lesson-practice action');
assert.match(app, /appendGrammarFocusWorkspacePage\(/,
  'Grammar Focus exports must create a new page through the existing classroom workspace');
const surfaceToggle = workspaceCanvas.match(/const toggleSurfaceMode = useCallback\(\(\) => \{([\s\S]*?)\n  \}, \[/)?.[1] ?? '';
assert.match(surfaceToggle, /saveWorkspaceSurfaceTransition\(/,
  'Board and Slides must switch through a single durable surface transition');
assert.doesNotMatch(surfaceToggle, /savePageSwitch\(|saveWorkspaceSurfaceMode\(/,
  'the surface switch must not race independent writes that reactivate the previous mode');

console.log('grammar focus workspace export tests passed');
