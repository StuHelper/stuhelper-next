import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkDocs, siteSlug } from './check-docs.mjs';
import { lintMarkdown } from './lint-markdown.mjs';

function fixture(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-docs-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  files['.markdownlint-cli2.yaml'] = "globs: ['**/*.md']\nignores: ['**/node_modules/**']\n";
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  return root;
}
const doc = (body, type = 'spec', date = '2026-10-23', status = 'InReview') =>
  `---\ntype: ${type}\nstatus: ${status}\nupdated: ${date}\n---\n\n${body}\n`;

test('valid reference links, Chinese headings and duplicate anchors resolve', (t) => {
  const root = fixture(t, {
    'docs/spec/README.md': doc('# 索引\n\n[主题][topic]\n\n[topic]: behavior.md#行为_1'),
    'docs/spec/behavior.md': doc('# 行为\n\n## 行为'),
  });
  assert.deepEqual(checkDocs(root).errors, []);
});

test('wrong location type, invalid date and status fail', (t) => {
  const root = fixture(t, { 'docs/spec/a.md': doc('# 内容', 'design', '2026-02-30', 'Done') });
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /type does not match/);
  assert.match(errors, /invalid updated date/);
  assert.match(errors, /invalid document status/);
});

test('a moved document or missing anchor is not accepted', (t) => {
  const root = fixture(t, {
    'docs/spec/a.md': doc('# 内容\n\n[旧文档](old.md) [锚点](b.md#不存在)'),
    'docs/spec/b.md': doc('# 存在'),
  });
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /missing or external local target/);
  assert.match(errors, /missing heading anchor/);
});

test('templates and code examples allow placeholders, ordinary prose does not', (t) => {
  const root = fixture(t, {
    'docs/spec/TEMPLATE.md': doc('# 模板\n\nTODO: 填写', 'spec', 'YYYY-MM-DD', 'Draft'),
    'docs/spec/a.md': doc('# 示例\n\n`TODO: literal`\n\n```text\nYYYY-MM-DD\n```'),
    'docs/spec/b.md': doc('# 未完成\n\nTODO: 填写'),
  });
  assert.deepEqual(checkDocs(root).errors, ['docs/spec/b.md: unfilled prose placeholder']);
});

test('ignored dependencies are not parsed and links cannot escape repository', (t) => {
  const root = fixture(t, {
    'node_modules/docs/broken.md': '[missing](absent.md)',
    'docs/spec/a.md': doc('# 内容\n\n[越界](../../../outside.md)'),
  });
  const result = checkDocs(root);
  assert.equal(result.count, 1);
  assert.match(result.errors[0], /missing or external local target/);
});

test('missing and duplicate YAML metadata fail without crashing', (t) => {
  const root = fixture(t, {
    'docs/spec/a.md': '# 没有元信息',
    'docs/spec/b.md': '---\ntype: spec\ntype: design\n---\n\n# 内容',
  });
  assert.match(checkDocs(root).errors.join('\n'), /missing frontmatter/);
  assert.match(checkDocs(root).errors.join('\n'), /invalid YAML metadata/);
});

test('format checks enforce rules while respecting the PR template exception', async (t) => {
  const root = fixture(t, {
    '.github/pull_request_template.md': '## Changes\n\nDescribe the changes.\n',
    'docs/spec/a.md': doc('# 标题\n\n$C_L$\n\n- item\n'),
    'README.md': '# Title\n\n##Missing space\n',
  });
  fs.appendFileSync(path.join(root, '.markdownlint-cli2.yaml'),
    "overrides:\n  - filter: ['.github/pull_request_template.md']\n    config: {MD041: false}\n    combine: merge\n");
  const errors = (await lintMarkdown(root)).join('\n');
  assert.match(errors, /MD018/);
  assert.doesNotMatch(errors, /MD041/);
});


test('site slugs match Unicode punctuation, empty and numbered duplicate headings', () => {
  const anchors = new Set();
  const headings = ['行为', '行为', '行为_1', '!!!', '!!!', 'A & B', 'Café', 'ＡＢＣ'];
  const actual = headings.map(text => { const id = siteSlug(text, anchors); anchors.add(id); return id; });
  assert.deepEqual(actual, ['行为', '行为_1', '行为_2', '_1', '_2', 'a-b', 'café', 'ａｂｃ']);
});

test('site duplicate anchors reject GitHub-only suffixes', (t) => {
  const root = fixture(t, {
    'docs/spec/a.md': doc('# 行为\n\n## 行为\n\n[错误](#行为-1)'),
  });
  assert.match(checkDocs(root).errors.join('\n'), /missing heading anchor/);
});

test('only the five categories are valid, including nested topics', (t) => {
  const root = fixture(t, {
    'docs/random/a.md': doc('# 内容', 'random'),
    'docs/spec/topic/a.md': doc('# 内容', 'topic'),
    'docs/spec/topic/b.md': doc('# 内容', 'spec'),
  });
  const errors = checkDocs(root).errors;
  assert.equal(errors.length, 2);
  assert(errors.every(error => error.includes('type does not match')));
});

test('only the first matching Markdown override is applied', async (t) => {
  const root = fixture(t, { 'README.md': '## Content\n' });
  fs.appendFileSync(path.join(root, '.markdownlint-cli2.yaml'),
    "overrides:\n  - filter: ['README.md']\n    config: {MD041: false}\n    combine: merge\n  - filter: ['**/*.md']\n    config: {MD041: true}\n    combine: merge\n");
  assert.doesNotMatch((await lintMarkdown(root)).join('\n'), /MD041/);
});


test('standard terminology rejects old aliases but accepts code identifiers', (t) => {
  const root = fixture(t, { 'docs/spec/a.md': doc('# 资格\n\n有效学生资格与 `学生认证通过`') });
  const errors = checkDocs(root).errors;
  assert.equal(errors.length, 1);
  assert.match(errors[0], /use standard term/);
});

test('repository GitHub links validate files and GitHub anchors locally', (t) => {
  const root = fixture(t, {
    'mkdocs.yml': 'repo_url: https://github.com/StuHelper/example\nnav:\n  - Topic: spec/a.md\n',
    'docs/spec/a.md': doc('# 行为\n\n## 行为\n\n[有效](https://github.com/StuHelper/example/blob/develop/docs/spec/a.md#行为-1) [错误](https://github.com/StuHelper/example/blob/develop/gone.md)'),
  });
  const errors = checkDocs(root).errors;
  assert.equal(errors.length, 1);
  assert.match(errors[0], /missing or external local target/);
});

test('new topics must appear in both category index and site navigation', (t) => {
  const root = fixture(t, {
    'mkdocs.yml': 'nav:\n  - Index: spec/README.md\n',
    'docs/spec/README.md': doc('# 索引'),
    'docs/spec/a.md': doc('# 新主题'),
  });
  const errors = checkDocs(root).errors.join('\n');
  assert.match(errors, /missing topic a.md/);
  assert.match(errors, /missing navigation spec\/a.md/);
});
