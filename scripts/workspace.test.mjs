import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { test } from 'node:test';
import { goWorkspace, needsIntegration, verifyScenarios, verifySource } from './workspace.mjs';

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
    fs.appendFileSync(output, '// custom local module\n');
    assert.throws(() => goWorkspace(directory), /custom entries/);
    assert.match(fs.readFileSync(output, 'utf8'), /custom local module/);
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
