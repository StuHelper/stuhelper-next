import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { goWorkspace, verifyScenarios, verifySource } from './workspace.mjs';

const digest = text => crypto.createHash('sha256').update(text).digest('hex');

test('client contracts are checked against their declared version, allowing a newer provider', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-contract-'));
  try {
    fs.mkdirSync(path.join(directory, 'contracts'));
    const body = 'openapi: 3.1.0\ninfo:\n  version: 0.1.0\n';
    fs.writeFileSync(path.join(directory, 'contracts/platform.openapi.yaml'), body);
    const source = { repository: 'StuHelper/stuhelper-platform', revision: 'a'.repeat(40), version: '0.1.0', sha256: digest(body), files: { 'contracts/platform.openapi.yaml': 'contracts/platform.openapi.yaml', 'sdk/platform.gen.ts': 'src/api/platform.gen.ts', 'contracts/client-cases.json': 'contracts/client-cases.json' } };
    fs.mkdirSync(path.join(directory, 'src/api'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'src/api/platform.gen.ts'), body);
    fs.writeFileSync(path.join(directory, 'contracts/client-cases.json'), body);
    const provider = { url: 'https://github.com/StuHelper/stuhelper-platform.git' };
    const client = { name: 'web', directory };
    verifySource(provider, client, source, (revision, filename) => { assert.equal(revision, source.revision); assert(Object.hasOwn(source.files, filename)); return body; });
    assert.throws(() => verifySource(provider, client, { ...source, files: {} }, () => body), /must cover/);
    assert.throws(() => verifySource(provider, client, { ...source, sha256: 'bad' }, () => body), /digest/);
    fs.writeFileSync(path.join(directory, 'contracts/platform.openapi.yaml'), body + 'tampered: true\n');
    assert.throws(() => verifySource(provider, client, source, () => body), /Snapshot differs/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('workspace generation uses installed Go repositories and preserves custom files', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-workspace-'));
  try {
    fs.mkdirSync(path.join(directory, 'architecture'));
    fs.mkdirSync(path.join(directory, 'workspace/platform'), { recursive: true });
    fs.writeFileSync(path.join(directory, 'architecture/toolchains.yaml'), '{"go":"1.27.3"}');
    fs.writeFileSync(path.join(directory, 'mani.yaml'), 'projects:\n  platform:\n    path: workspace/platform\n  web:\n    path: workspace/web\n');
    fs.writeFileSync(path.join(directory, 'workspace/platform/go.mod'), 'module example.test/platform\n');
    goWorkspace(directory);
    const output = path.join(directory, 'go.work');
    assert.match(fs.readFileSync(output, 'utf8'), /workspace\/platform/);
    assert.doesNotMatch(fs.readFileSync(output, 'utf8'), /workspace\/web/);
    fs.mkdirSync(path.join(directory, 'custom'));
    fs.writeFileSync(path.join(directory, 'custom/go.mod'), 'module example.test/custom\ngo 1.27.3\n');
    fs.appendFileSync(output, '// custom local module\nuse ./custom\n');
    goWorkspace(directory);
    assert.match(fs.readFileSync(output, 'utf8'), /custom local module/);
    assert.match(fs.readFileSync(output, 'utf8'), /use \.\/custom/);
  } finally { fs.rmSync(directory, { recursive: true }); }
});

test('implemented scenarios reference an existing specification and executable test', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-scenario-'));
  t.after(() => fs.rmSync(directory, { recursive: true }));
  fs.writeFileSync(path.join(directory, 'spec.md'), '| MOD-06 | condition | result |');
  fs.writeFileSync(path.join(directory, 'module_test.go'), 'func TestOptional(t *testing.T) {}');
  const definition = { specifications: ['spec.md'], scenario_tests: { 'MOD-06': ['module_test.go#TestOptional'] } };
  verifyScenarios(directory, definition, directory);
  assert.throws(() => verifyScenarios(directory, { ...definition, scenario_tests: { 'MOD-99': ['module_test.go#TestOptional'] } }, directory), /Unknown implemented scenario/);
  fs.writeFileSync(path.join(directory, 'module_test.go'), '');
  assert.throws(() => verifyScenarios(directory, definition, directory), /Missing scenario test/);
});



test('standalone architecture validation is independent of stale sibling checkouts', async t => {
  const { validate, toolchains } = await import('./workspace.mjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-independent-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  fs.mkdirSync(path.join(directory, 'architecture'));
  fs.writeFileSync(path.join(directory, 'mani.yaml'), 'sync_remotes: false\nsync_gitignore: false\nremove_orphaned_worktrees: false\nspecs:\n  default:\n    ignore_errors: false\n    ignore_non_existing: false\nprojects:\n  web:\n    path: workspace/web\n    url: https://github.com/StuHelper/stuhelper-web.git\n    branch: develop\n');
  fs.writeFileSync(path.join(directory, 'architecture/modules.yaml'), 'modules: []\noperations: []\napplications:\n  - repository: StuHelper/stuhelper-web\n');
  const versions = { node: '24.22.1', go: '1.27.3', pnpm: '10.33.4', lefthook: '2.2.2' };
  fs.writeFileSync(path.join(directory, 'architecture/toolchains.yaml'), JSON.stringify(versions));
  const pkg = { engines: { node: versions.node, pnpm: versions.pnpm }, packageManager: `pnpm@${versions.pnpm}`, devDependencies: { lefthook: versions.lefthook } };
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify(pkg));
  fs.writeFileSync(path.join(directory, '.node-version'), versions.node);
  fs.writeFileSync(path.join(directory, '.go-version'), versions.go);
  const consumer = path.join(directory, 'workspace/web');
  fs.mkdirSync(path.join(consumer, '.git'), { recursive: true });
  fs.writeFileSync(path.join(consumer, '.node-version'), '22.0.0');
  validate(directory);
  assert.throws(() => toolchains(directory), /node-version/);
  assert.equal(fs.readFileSync(path.join(consumer, '.node-version'), 'utf8'), '22.0.0');
});

test('source records accept official checkout URLs but reject a different repository or dirty candidate', async t => {
  const { snapshot } = await import('./workspace.mjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-source-record-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const checkout = path.join(directory, 'workspace/platform');
  fs.mkdirSync(checkout, { recursive: true });
  fs.writeFileSync(path.join(directory, 'mani.yaml'), 'projects:\n  platform:\n    path: workspace/platform\n    url: https://github.com/StuHelper/stuhelper-platform.git\n');
  const git = (...args) => execFileSync('git', args, { cwd: checkout, encoding: 'utf8', stdio: 'pipe' }).trim();
  git('init', '-q'); git('config', 'user.name', 'Fixture'); git('config', 'user.email', 'fixture@example.test');
  fs.writeFileSync(path.join(checkout, 'source.txt'), 'source\n'); git('add', '.'); git('commit', '-qm', 'fixture');
  git('remote', 'add', 'origin', 'https://github.com/StuHelper/stuhelper-platform');
  assert.equal(snapshot(directory, true).projects.platform.revision, git('rev-parse', 'HEAD'));
  git('remote', 'set-url', 'origin', 'git@github.com:StuHelper/stuhelper-platform.git');
  snapshot(directory, true);
  git('remote', 'set-url', 'origin', 'https://github.com/other/stuhelper-platform.git');
  assert.throws(() => snapshot(directory), /Unexpected origin/);
  git('remote', 'set-url', 'origin', 'https://github.com/StuHelper/stuhelper-platform');
  fs.writeFileSync(path.join(checkout, 'source.txt'), 'uncommitted\n');
  assert.throws(() => snapshot(directory, true), /Commit candidate changes/);
});

test('contract provenance retrieves the declared historical commit from a fresh checkout without switching it', async t => {
  const { providerSource } = await import('./workspace.mjs');
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-provider-history-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const origin = path.join(directory, 'origin'); fs.mkdirSync(origin);
  const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: 'pipe' }).trim();
  git(origin, 'init', '-b', 'develop', '-q'); git(origin, 'config', 'user.name', 'Fixture'); git(origin, 'config', 'user.email', 'fixture@example.test');
  fs.mkdirSync(path.join(origin, 'contracts'));
  fs.writeFileSync(path.join(origin, 'contracts/api.yaml'), 'version: old\n'); git(origin, 'add', '.'); git(origin, 'commit', '-qm', 'original');
  const declared = git(origin, 'rev-parse', 'HEAD');
  fs.writeFileSync(path.join(origin, 'contracts/api.yaml'), 'version: current\n'); git(origin, 'add', '.'); git(origin, 'commit', '-qm', 'current');
  const current = git(origin, 'rev-parse', 'HEAD'); const checkout = path.join(directory, 'checkout');
  git(directory, 'clone', '--depth', '1', `file://${origin}`, checkout);
  assert.throws(() => git(checkout, 'cat-file', '-e', `${declared}^{commit}`));
  assert.equal(providerSource(checkout, declared, 'contracts/api.yaml'), 'version: old\n');
  assert.equal(git(checkout, 'rev-parse', 'HEAD'), current);
  assert.equal(git(checkout, 'status', '--porcelain'), '');
});
