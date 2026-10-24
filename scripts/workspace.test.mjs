import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { execFileSync } from 'node:child_process';
import { engineeringTools, goWorkspace, needsIntegration, verifyScenarios, verifySource, toolchains } from './workspace.mjs';

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
    fs.writeFileSync(path.join(directory, 'architecture/toolchains.json'), '{"go":"1.27.3"}');
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

test('documentation-only changes skip integration while contracts, tools and CI require it', () => {
  assert.equal(needsIntegration(['README.md', 'docs/spec/academic-content.md']), false);
  for (const file of ['architecture/modules.json', 'workspace.lock.json', 'mani.yaml', 'scripts/workspace.mjs', '.github/workflows/ci.yml', 'tests/e2e/framework.spec.mjs', '.node-version']) assert.equal(needsIntegration([file]), true, file);
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


test('toolchain upgrades preserve workflow comments, expressions and multiline commands', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-toolchains-'));
  t.after(() => fs.rmSync(directory, { recursive: true }));
  fs.mkdirSync(path.join(directory, 'architecture'));
  fs.mkdirSync(path.join(directory, '.github/workflows'), { recursive: true });
  fs.writeFileSync(path.join(directory, 'mani.yaml'), 'projects: {}\n');
  fs.writeFileSync(path.join(directory, 'architecture/toolchains.json'), JSON.stringify({ go: '1.27.3', node: '24.22.1', pnpm: '10.33.4', uv: '0.12.18' }));
  const workflow = path.join(directory, '.github/workflows/ci.yml');
  fs.writeFileSync(workflow, '# runner boundary\njobs:\n  check:\n    runs-on: ubuntu-26.04 # ordinary checks\n    steps:\n      - uses: astral-sh/setup-uv@v10.3.2\n        with:\n          version: "0.12.0" # tool version\n      - run: |\n          echo "${{ github.ref }}"\n          pnpm run check\n');
  toolchains(directory, true);
  const actual = fs.readFileSync(workflow, 'utf8');
  for (const retained of ['# runner boundary', '# ordinary checks', '# tool version', '${{ github.ref }}', 'run: |']) assert(actual.includes(retained), retained);
  assert(actual.includes('0.12.18'));
  assert(actual.includes('pnpm run check'));
  toolchains(directory, true);
  assert.equal(fs.readFileSync(workflow, 'utf8'), actual, 'A second update is byte-stable');
});

test('shared tools pin all checked-out consumers and reject source or version drift', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-tools-pin-'));
  t.after(() => fs.rmSync(directory, { recursive: true }));
  const runGit = (...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  runGit('init');
  fs.mkdirSync(path.join(directory, 'tooling'));
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ version: '0.1.0', files: ['tooling'] }));
  fs.writeFileSync(path.join(directory, 'tooling/check.mjs'), 'export const version = 1;');
  runGit('add', '.');
  runGit('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'commit', '-m', 'tools');
  runGit('-c', 'user.name=Test', '-c', 'user.email=test@example.test', 'tag', '-a', 'tooling-v0.1.0', '-m', 'Release tools');
  const revision = '0.1.0';
  fs.writeFileSync(path.join(directory, 'mani.yaml'), 'projects:\n  web:\n    path: workspace/web\n');
  fs.writeFileSync(path.join(directory, 'workspace.lock.json'), '{"schema_version":1,"projects":{}}');
  fs.mkdirSync(path.join(directory, 'workspace/web'), { recursive: true });
  const consumer = path.join(directory, 'workspace/web/package.json');
  fs.writeFileSync(consumer, '{}');
  engineeringTools(directory, revision, true);
  engineeringTools(directory);
  fs.writeFileSync(consumer, '{}');
  assert.throws(() => engineeringTools(directory), /version differs: web/);
  engineeringTools(directory, revision, true);
  fs.writeFileSync(path.join(directory, 'tooling/check.mjs'), 'export const version = 2;');
  assert.throws(() => engineeringTools(directory), /Engineering tools differ/);
});
