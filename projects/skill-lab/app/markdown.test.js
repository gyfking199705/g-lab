import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderMarkdown, esc } from './markdown.js';

test('renders headings', () => {
  assert.match(renderMarkdown('# Title'), /<h1 class="md-h1">Title<\/h1>/);
  assert.match(renderMarkdown('### Sub'), /<h3 class="md-h3">Sub<\/h3>/);
});

test('renders paragraphs joining wrapped lines', () => {
  assert.match(renderMarkdown('hello\nworld'), /<p class="md-p">hello world<\/p>/);
});

test('renders unordered and ordered lists', () => {
  assert.match(renderMarkdown('- a\n- b'), /<ul class="md-ul"><li>a<\/li><li>b<\/li><\/ul>/);
  assert.match(renderMarkdown('1. a\n2. b'), /<ol class="md-ol"><li>a<\/li><li>b<\/li><\/ol>/);
});

test('renders fenced code blocks with language and escapes content', () => {
  const html = renderMarkdown('```js\nconst x = 1 < 2;\n```');
  assert.match(html, /<pre class="md-pre"><code class="lang-js">/);
  assert.match(html, /1 &lt; 2;/);
});

test('renders inline code, bold, italic, links', () => {
  assert.match(renderMarkdown('use `npm i` now'), /<code class="md-code">npm i<\/code>/);
  assert.match(renderMarkdown('**bold**'), /<strong>bold<\/strong>/);
  assert.match(renderMarkdown('say *hi*'), /<em>hi<\/em>/);
  assert.match(renderMarkdown('[g](https://x.io)'), /<a class="md-a" href="https:\/\/x\.io"[^>]*>g<\/a>/);
});

test('escapes html to prevent injection', () => {
  assert.match(renderMarkdown('<script>alert(1)</script>'), /&lt;script&gt;/);
  assert.doesNotMatch(renderMarkdown('a <b> c'), /<b>/);
});

test('does not wrap plain prose numbers as code', () => {
  const html = renderMarkdown('we ran 3 times');
  assert.doesNotMatch(html, /<code/);
  assert.match(html, /we ran 3 times/);
});

test('renders blockquote and hr', () => {
  assert.match(renderMarkdown('> note'), /<blockquote class="md-quote">note<\/blockquote>/);
  assert.match(renderMarkdown('---'), /<hr class="md-hr" \/>/);
});

test('esc handles ampersand and quotes', () => {
  assert.equal(esc('a & "b"'), 'a &amp; &quot;b&quot;');
});
