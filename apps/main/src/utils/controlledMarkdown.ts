export type ControlledMarkdownBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string }
  | { type: 'unordered-list'; items: string[] }
  | { type: 'ordered-list'; items: string[] }
  | { type: 'example'; text: string };

export function sanitizeMarkdownText(value: string): string {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '');
}

export function parseControlledMarkdown(value: string): ControlledMarkdownBlock[] {
  const lines = sanitizeMarkdownText(value).split('\n');
  const blocks: ControlledMarkdownBlock[] = [];
  let paragraph: string[] = [];
  let unordered: string[] = [];
  let ordered: string[] = [];

  const flushParagraph = () => {
    const text = paragraph.join(' ').trim();
    if (text) blocks.push({ type: 'paragraph', text });
    paragraph = [];
  };
  const flushLists = () => {
    if (unordered.length) blocks.push({ type: 'unordered-list', items: unordered });
    if (ordered.length) blocks.push({ type: 'ordered-list', items: ordered });
    unordered = [];
    ordered = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      flushLists();
      continue;
    }
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      flushParagraph();
      flushLists();
      blocks.push({ type: 'heading', level: heading[1].length as 1 | 2 | 3, text: heading[2] });
      continue;
    }
    const unorderedItem = line.match(/^[-+*]\s+(.+)$/);
    if (unorderedItem) {
      flushParagraph();
      if (ordered.length) flushLists();
      unordered.push(unorderedItem[1]);
      continue;
    }
    const orderedItem = line.match(/^\d+[.)]\s+(.+)$/);
    if (orderedItem) {
      flushParagraph();
      if (unordered.length) flushLists();
      ordered.push(orderedItem[1]);
      continue;
    }
    const example = line.match(/^>\s*(?:example|exemplo|ejemplo)?\s*:?[ ]*(.+)$/i);
    if (example) {
      flushParagraph();
      flushLists();
      blocks.push({ type: 'example', text: example[1] });
      continue;
    }
    flushLists();
    paragraph.push(line);
  }

  flushParagraph();
  flushLists();
  return blocks;
}
