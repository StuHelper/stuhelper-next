import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { resolveIntegration, validateRecord, integrationRepositories, writeIntegrationRecord, checkoutRecord, commitRelation } from './integration.mjs';

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-integration-'));
  t.after(() => fs.rmSync(directory, { recursive: true }));
  const git = (...args) => execFileSync('git', ['-C', directory, '-c', 'user.name=Test', '-c', 'user.email=test@example.test', ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  git('init', '-b', 'develop');
  fs.writeFileSync(path.join(directory, '.gitignore'), 'workspace/\n');
  const projects = Object.fromEntries(['platform', 'web', 'admin'].map(name => [name, { url: `https://github.com/StuHelper/stuhelper-${name}.git`, path: `workspace/${name}`, branch: 'develop', tags: ['code'] }]));
  fs.writeFileSync(path.join(directory, 'mani.yaml'), JSON.stringify({ projects }));
  fs.writeFileSync(path.join(directory, 'workspace.lock.json'), JSON.stringify({ schema_version: 1, engineering_tools: { version: '0.1.0' }, projects: Object.fromEntries(Object.keys(projects).map(name => [name, { revision: '1'.repeat(40) }])) }));
  git('add', '.'); git('commit', '-m', 'coordinator');
  const revision = git('rev-parse', 'HEAD');
  const calls = [];
  const remote = {
    ref: async p => { calls.push(p.name); return p.name === 'architecture' ? revision : '2'.repeat(40); },
    pull: async (p, number) => ({ state: 'open', merged: false, head: { sha: '3'.repeat(40) }, base: { ref: 'develop', repo: { full_name: p.repository } } }),
    file: async () => ({ engineering_tools: { version: '0.1.0', revision: '4'.repeat(40) }, projects: Object.fromEntries(Object.keys(projects).map(name => [name, { revision: '1'.repeat(40) }])) }),
    tooling: async () => '4'.repeat(40),
  };
  return { directory, revision, git, remote, calls };
}

test('latest uses the current candidate, explicit paired PRs and latest untouched repositories', async t => {
  const f = fixture(t);
  const original = fs.readFileSync(path.join(f.directory, 'workspace.lock.json'), 'utf8');
  const record = await resolveIntegration(f.directory, { candidateRepository: 'StuHelper/stuhelper-web', candidateRevision: '5'.repeat(40), candidates: { platform: 'pr:2', web: 'pr:99' } }, f.remote);
  assert.equal(record.sources.web.revision, '5'.repeat(40));
  assert.equal(record.sources.platform.revision, '3'.repeat(40));
  assert.equal(record.sources.admin.revision, '2'.repeat(40));
  assert.deepEqual(f.calls, ['architecture', 'admin']);
  assert.equal(fs.readFileSync(path.join(f.directory, 'workspace.lock.json'), 'utf8'), original);
  assert.equal(record.coordinator.revision, f.revision);
});

test('merged paired PRs return to develop, while abandoned PRs require correction', async t => {
  const f = fixture(t);
  f.remote.pull = async p => ({ state: 'closed', merged: true, base: { ref: 'develop', repo: { full_name: p.repository } } });
  const record = await resolveIntegration(f.directory, { candidates: { platform: 'pr:2' } }, f.remote);
  assert.equal(record.sources.platform.revision, '2'.repeat(40));
  assert.match(record.sources.platform.selection, /merged/);
  f.remote.pull = async p => ({ state: 'closed', merged: false, base: { ref: 'develop', repo: { full_name: p.repository } } });
  await assert.rejects(resolveIntegration(f.directory, { candidates: { platform: 'pr:2' } }, f.remote), /关闭且未合并/);
});

test('fixed and replay records do not silently acquire latest sources', async t => {
  const f = fixture(t);
  const record = await resolveIntegration(f.directory, { source: 'fixed', candidateRepository: 'StuHelper/stuhelper-web', candidateRevision: '5'.repeat(40) }, f.remote);
  assert.deepEqual(f.calls, ['architecture']);
  assert.equal(record.sources.web.revision, '1'.repeat(40));
  assert.equal(record.sources.architecture.revision, f.revision);
  const unavailable = new Proxy({}, { get() { throw new Error('Network is unavailable'); } });
  assert.deepEqual(await resolveIntegration(f.directory, { replay: record }, unavailable), record);
  const summary = path.join(f.directory, 'summary.md');
  const output = path.join(f.directory, 'record.json');
  writeIntegrationRecord(record, output, summary);
  assert.deepEqual(JSON.parse(fs.readFileSync(output, 'utf8')), record);
  assert(fs.readFileSync(summary, 'utf8').includes(record.coordinator.revision));
  assert(fs.readFileSync(summary, 'utf8').includes('tooling-v0.1.0'));
  assert.throws(() => writeIntegrationRecord(record, output, summary), /EEXIST/);
});

test('invalid candidate repositories, selectors, moved tags and tampered replay records fail', async t => {
  const f = fixture(t);
  await assert.rejects(resolveIntegration(f.directory, { candidates: { unknown: 'pr:2' } }, f.remote), /未知候选仓库/);
  await assert.rejects(resolveIntegration(f.directory, { candidates: { web: 'https://example.test' } }, f.remote), /无效候选来源/);
  await assert.rejects(resolveIntegration(f.directory, { source: 'fixed', candidates: { web: 'pr:2' } }, f.remote), /fixed 模式/);
  const record = await resolveIntegration(f.directory, {}, f.remote);
  const tampered = structuredClone(record); tampered.sources.web.repository = 'Other/repository';
  assert.throws(() => validateRecord(tampered, integrationRepositories(f.directory)), /源码仓库不一致/);
  f.remote.tooling = async () => '9'.repeat(40);
  await assert.rejects(resolveIntegration(f.directory, {}, f.remote), /发行 tag 已改变/);
});

test('checkout requires the recorded architecture and preserves every existing checkout', async t => {
  const f = fixture(t);
  const record = await resolveIntegration(f.directory, {}, f.remote);
  const wrong = structuredClone(record); wrong.sources.architecture.revision = '1'.repeat(40);
  assert.throws(() => checkoutRecord(f.directory, wrong), /先检出记录中的架构提交/);
  fs.mkdirSync(path.join(f.directory, 'workspace/web'), { recursive: true });
  assert.throws(() => checkoutRecord(f.directory, record), /Existing checkout preserved/);
  assert(!fs.existsSync(path.join(f.directory, 'workspace/platform')));
});

test('commit relation reports ahead and divergence without treating candidates as stale failures', t => {
  const f = fixture(t);
  const first = f.revision;
  fs.writeFileSync(path.join(f.directory, 'change'), 'a'); f.git('add', '.'); f.git('commit', '-m', 'second');
  const second = f.git('rev-parse', 'HEAD');
  assert.deepEqual(commitRelation(f.directory, first, second), { state: 'behind', ahead: 0, behind: 1 });
  assert.deepEqual(commitRelation(f.directory, second, first), { state: 'ahead', ahead: 1, behind: 0 });
  f.git('checkout', '--detach', first);
  fs.writeFileSync(path.join(f.directory, 'change'), 'b'); f.git('add', '.'); f.git('commit', '-m', 'branch');
  assert.equal(commitRelation(f.directory, second, f.git('rev-parse', 'HEAD')).state, 'diverged');
});

test('recorded checkout clones exact sources and does not follow later commits', async t => {
  const f = fixture(t);
  const manifest = JSON.parse(fs.readFileSync(path.join(f.directory, 'mani.yaml'), 'utf8'));
  for (const p of Object.values(manifest.projects)) p.url = f.directory;
  fs.writeFileSync(path.join(f.directory, 'mani.yaml'), JSON.stringify(manifest));
  f.git('add', '.'); f.git('commit', '-m', 'local test remotes');
  const architecture = f.git('rev-parse', 'HEAD');
  f.git('tag', '-a', 'tooling-v0.1.0', '-m', 'Test release');
  f.remote.ref = async p => p.name === 'architecture' ? architecture : f.revision;
  f.remote.file = async () => ({ engineering_tools: { version: '0.1.0', revision: architecture } });
  f.remote.tooling = async () => architecture;
  const record = await resolveIntegration(f.directory, {}, f.remote);
  checkoutRecord(f.directory, record);
  for (const name of ['platform', 'web', 'admin']) {
    const actual = execFileSync('git', ['-C', path.join(f.directory, `workspace/${name}`), 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    assert.equal(actual, f.revision);
  }
});
