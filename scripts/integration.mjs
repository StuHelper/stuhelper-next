import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';
import { toolsRepository, toolsTag, remoteToolsRevision } from '../tooling/release.mjs';

const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const sha = value => assert.match(value ?? '', /^[0-9a-f]{40}$/, '源码记录必须使用完整提交号。');
export function integrationRepositories(directory) {
  const manifest = YAML.parse(fs.readFileSync(path.join(directory, 'mani.yaml'), 'utf8'));
  return [{ name: 'architecture', repository: 'StuHelper/stuhelper-next', url: toolsRepository, branch: 'develop', directory }, ...Object.entries(manifest.projects).filter(([, p]) => p.tags.includes('code')).map(([name, p]) => ({ name, repository: `StuHelper/stuhelper-${name}`, ...p, directory: path.resolve(directory, p.path) }))];
}
async function github(endpoint) {
  const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  if (process.env.GH_TOKEN) headers.Authorization = `Bearer ${process.env.GH_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${endpoint}`, { headers, signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new Error(`GitHub 读取失败：${response.status} ${endpoint}`);
  return response.json();
}
export const remoteSources = {
  ref: async p => {
    const output = execFileSync('git', ['ls-remote', '--heads', p.url, `refs/heads/${p.branch}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
    const revision = output.split(/\s+/)[0]; sha(revision); return revision;
  },
  pull: async (p, number) => github(`${p.repository}/pulls/${number}`),
  file: async (p, revision, file) => {
    const result = await github(`${p.repository}/contents/${file}?ref=${revision}`);
    assert.equal(result.encoding, 'base64');
    return JSON.parse(Buffer.from(result.content, 'base64').toString('utf8'));
  },
  tooling: async version => remoteToolsRevision(version),
};
export function validateRecord(record, repositories) {
  assert.equal(record.schema_version, 2, '源码组合记录格式必须为版本 2。');
  sha(record.coordinator.revision);
  assert.deepEqual(Object.keys(record.sources).sort(), repositories.map(p => p.name).sort(), '源码组合必须包含架构与全部代码仓库。');
  for (const p of repositories) {
    const source = record.sources[p.name];
    assert.equal(source.repository, p.repository, `源码仓库不一致：${p.name}`);
    sha(source.revision);
    assert(typeof source.selection === 'string' && /^[A-Za-z0-9 #().-]{1,100}$/.test(source.selection), '源码选择说明格式无效。');
  }
  toolsTag(record.engineering_tools.version);
  sha(record.engineering_tools.revision);
  return record;
}
export async function resolveIntegration(directory, options = {}, remote = remoteSources) {
  const repositories = integrationRepositories(directory);
  if (options.replay) {
    const record = validateRecord(options.replay, repositories);
    assert.equal(git(directory, 'rev-parse', 'HEAD'), record.coordinator.revision, '重放时先检出记录中的协调器提交。');
    return record;
  }
  const mode = options.source ?? 'latest';
  assert(['latest', 'fixed'].includes(mode), '检查模式必须为 latest 或 fixed。');
  const overrides = options.candidates ?? {};
  assert(overrides && typeof overrides === 'object' && !Array.isArray(overrides), '候选覆盖必须是对象。');
  for (const [name, value] of Object.entries(overrides)) {
    assert(repositories.some(p => p.name === name), `未知候选仓库：${name}`);
    assert(typeof value === 'string' && /^(?:[0-9a-f]{40}|pr:[1-9]\d*)$/.test(value), `无效候选来源：${name}`);
  }
  if (mode === 'fixed') assert(Object.keys(overrides).every(name => name === 'architecture'), 'fixed 模式只接受架构来源，模块使用该版本记录的组合。');
  if (options.candidateRepository) {
    assert(repositories.some(p => p.repository === options.candidateRepository), '当前候选仓库不在集成清单中。');
    sha(options.candidateRevision);
  }
  const coordinator = { revision: git(directory, 'rev-parse', 'HEAD') };
  let selectedLock;
  const sources = {};
  for (const p of repositories) {
    let revision, selection;
    if (mode === 'fixed' && p.name !== 'architecture') {
      revision = selectedLock.projects[p.name].revision;
      selection = 'fixed';
    } else if (p.repository === options.candidateRepository) {
      revision = options.candidateRevision; selection = 'current candidate';
    } else if (overrides[p.name]?.startsWith('pr:')) {
      const number = Number(overrides[p.name].slice(3));
      const pr = await remote.pull(p, number);
      assert.equal(pr.base.repo.full_name, p.repository, '配套 PR 的目标仓库不匹配。');
      assert.equal(pr.base.ref, p.branch, '配套 PR 必须以 develop 为目标。');
      if (pr.state === 'open') { revision = pr.head.sha; selection = `PR #${number}`; }
      else if (pr.merged) { revision = await remote.ref(p); selection = `develop (PR #${number} merged)`; }
      else throw new Error(`${p.repository}#${number} 已关闭且未合并，请修正配套候选。`);
    } else if (overrides[p.name]) {
      revision = overrides[p.name]; selection = 'explicit candidate';
    } else {
      revision = await remote.ref(p); selection = 'latest develop';
    }
    sha(revision);
    sources[p.name] = { repository: p.repository, revision, selection };
    if (p.name === 'architecture') selectedLock = await remote.file(p, revision, 'workspace.lock.json');
  }
  const version = selectedLock.engineering_tools.version;
  const revision = await remote.tooling(version);
  if (selectedLock.engineering_tools.revision) assert.equal(revision, selectedLock.engineering_tools.revision, '工程工具发行 tag 已改变。');
  return validateRecord({ schema_version: 2, coordinator, sources, engineering_tools: { version, revision } }, repositories);
}
export function writeIntegrationRecord(record, output, summary = process.env.GITHUB_STEP_SUMMARY) {
  if (output) fs.writeFileSync(output, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
  const json = JSON.stringify(record);
  console.log(`Integration record: ${json}`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `architecture_revision=${record.sources.architecture.revision}\nrecord=${json}\n`);
  if (summary) {
    const rows = Object.entries(record.sources).map(([name, source]) => `| ${name} | \`${source.revision}\` | ${source.selection} |`).join('\n');
    fs.appendFileSync(summary, `## Integration sources\n\n| Repository | Commit | Selection |\n| --- | --- | --- |\n${rows}\n\nCoordinator: \`${record.coordinator.revision}\`\n\nEngineering tools: \`${toolsTag(record.engineering_tools.version)}\` / \`${record.engineering_tools.revision}\`\n\nCopy this JSON into the workflow's replay input, or save it as integration.json for local replay.\n\n\`\`\`json\n${JSON.stringify(record, null, 2)}\n\`\`\`\n`);
  }
}
export function checkoutRecord(directory, record) {
  const repositories = integrationRepositories(directory);
  validateRecord(record, repositories);
  assert.equal(git(directory, 'rev-parse', 'HEAD'), record.sources.architecture.revision, '先检出记录中的架构提交，再重放模块组合。');
  for (const p of repositories.filter(p => p.name !== 'architecture')) assert(!fs.existsSync(p.directory), `Existing checkout preserved: ${p.directory}`);
  const version = record.engineering_tools.version;
  assert.equal(readJSON(path.join(directory, 'workspace.lock.json')).engineering_tools.version, version, '重放记录与架构的工具版本不一致。');
  const tag = toolsTag(version);
  try { git(directory, 'rev-parse', '--verify', `refs/tags/${tag}`); }
  catch { execFileSync('git', ['-C', directory, 'fetch', 'origin', `refs/tags/${tag}:refs/tags/${tag}`], { stdio: 'inherit' }); }
  assert.equal(git(directory, 'rev-parse', `refs/tags/${tag}^{commit}`), record.engineering_tools.revision, '重放记录的工具 tag 与提交不一致。');
  for (const p of repositories.filter(p => p.name !== 'architecture')) {
    const revision = record.sources[p.name].revision;
    execFileSync('git', ['clone', '--no-checkout', '--', p.url, p.directory], { stdio: 'inherit' });
    try { git(p.directory, 'cat-file', '-e', `${revision}^{commit}`); }
    catch { execFileSync('git', ['-C', p.directory, 'fetch', 'origin', revision], { stdio: 'inherit' }); }
    execFileSync('git', ['-C', p.directory, 'checkout', '--detach', revision], { stdio: 'inherit' });
  }
}
export function commitRelation(directory, recorded, current) {
  sha(recorded); sha(current);
  const [ahead, behind] = git(directory, 'rev-list', '--left-right', '--count', `${recorded}...${current}`).split(/\s+/).map(Number);
  return { state: ahead && behind ? 'diverged' : ahead ? 'ahead' : behind ? 'behind' : 'same', ahead, behind };
}
export async function integrationStatus(directory, record) {
  const repositories = integrationRepositories(directory);
  validateRecord(record, repositories);
  for (const p of repositories) {
    const current = await remoteSources.ref(p);
    for (const revision of [current, record.sources[p.name].revision]) {
      try { git(p.directory, 'cat-file', '-e', `${revision}^{commit}`); }
      catch { execFileSync('git', ['-C', p.directory, 'fetch', 'origin', revision], { stdio: 'inherit' }); }
    }
    console.log(p.name, JSON.stringify(commitRelation(p.directory, record.sources[p.name].revision, current)));
  }
}
