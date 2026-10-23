import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkDocs } from './check-docs.mjs';
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
    'docs/spec/README.md': doc('# 索引\n\n[主题][topic]\n\n[topic]: behavior.md#行为-1'),
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
