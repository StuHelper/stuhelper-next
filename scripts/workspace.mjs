import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { parseArgs } from 'node:util';
import { toolsRepository, toolsTag, remoteToolsRevision, checkConsumerRelease } from '../tooling/release.mjs';
import { resolveIntegration, writeIntegrationRecord, checkoutRecord, integrationStatus } from './integration.mjs';
import { descriptor } from '../tooling/modules.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function manifest(directory = root) {
  return YAML.parse(fs.readFileSync(path.join(directory, 'mani.yaml'), 'utf8'));
}
export function projects(directory = root) {
  return Object.entries(manifest(directory).projects).map(([name, value]) => ({ name, ...value, directory: path.resolve(directory, value.path) }));
}
export function validate(directory = root) {
  const config = manifest(directory);
  for (const flag of ['sync_remotes', 'sync_gitignore', 'remove_orphaned_worktrees']) assert.equal(config[flag], false, flag);
  assert.equal(config.specs.default.ignore_errors, false);
  assert.equal(config.specs.default.ignore_non_existing, false);
  const modules = readJSON(path.join(directory, 'architecture/modules.json'));
  const repositories = new Set([...modules.modules, ...modules.applications, ...(modules.operations ?? [])].map(item => item.repository));
  for (const project of projects(directory)) {
    assert.match(project.name, /^[a-z][a-z-]*$/);
    assert.equal(project.url, `https://github.com/StuHelper/stuhelper-${project.name}.git`);
    assert.equal(project.path, `workspace/${project.name}`);
    assert.equal(project.branch, 'develop');
    assert(repositories.has(`StuHelper/stuhelper-${project.name}`), `Missing repository declaration: ${project.name}`);
    assert(!project.worktrees, 'Task worktrees are managed by git worktree');
  }
  const versions = readJSON(path.join(directory, 'architecture/toolchains.json'));
  assert.equal(fs.readFileSync(path.join(directory, '.node-version'), 'utf8').trim(), versions.node);
  assert.equal(fs.readFileSync(path.join(directory, '.go-version'), 'utf8').trim(), versions.go);
  const lockFile = path.join(directory, 'workspace.lock.json');
  if (fs.existsSync(lockFile)) {
    const lock = readJSON(lockFile);
    assert.deepEqual(Object.keys(lock.projects).sort(), projects(directory).filter(project => project.tags.includes('code')).map(project => project.name).sort());
    for (const project of Object.values(lock.projects)) assert.match(project.revision, /^[0-9a-f]{40}$/);
    if (lock.engineering_tools) engineeringTools(directory);
  }
}
export function inspect(directory = root, codeOnly = true) {
  return projects(directory).filter(project => !codeOnly || project.tags.includes('code')).map(project => {
    assert(fs.existsSync(project.directory), `Missing checkout ${project.name}: run mani sync`);
    assert.equal(fs.realpathSync(git(project.directory, 'rev-parse', '--show-toplevel')), fs.realpathSync(project.directory));
    const remote = git(project.directory, 'remote', 'get-url', 'origin');
    assert([project.url, project.url.replace('https://github.com/', 'git@github.com:')].includes(remote), `Unexpected origin: ${project.name}`);
    return { ...project, revision: git(project.directory, 'rev-parse', 'HEAD'), dirty: Boolean(git(project.directory, 'status', '--porcelain')) };
  });
}
export function verifySource(provider, client, source, loadSource) {
  assert.match(source.revision, /^[0-9a-f]{40}$/);
  assert.equal(source.repository, provider.url.replace('https://github.com/', '').replace(/\.git$/, ''));
  const generated = client.name === 'admin' ? 'apps/web-antd/src/api/platform.gen.ts' : 'src/api/platform.gen.ts';
  assert.deepEqual(source.files, {
    'contracts/platform.openapi.yaml': 'contracts/platform.openapi.yaml',
    'sdk/platform.gen.ts': generated,
    'contracts/client-cases.json': 'contracts/client-cases.json',
  }, 'Source record must cover the contract, generated types and shared cases');
  for (const [providerFile, clientFile] of Object.entries(source.files)) {
    for (const filename of [providerFile, clientFile]) assert(!path.isAbsolute(filename) && !filename.split('/').includes('..'), 'Invalid snapshot path');
    const expected = loadSource(source.revision, providerFile);
    assert.equal(fs.readFileSync(path.join(client.directory, clientFile), 'utf8'), expected, `Snapshot differs from declared provider revision: ${client.name}/${clientFile}`);
  }
  const contract = fs.readFileSync(path.join(client.directory, 'contracts/platform.openapi.yaml'));
  assert.equal(hash(contract), source.sha256, 'Contract digest differs from source record');
  assert.equal(YAML.parse(contract.toString()).info.version, source.version, 'Contract version differs from source record');
}
export function verifyScenarios(directory, definition, checkout) {
  const specs = definition.specifications.map(file => fs.readFileSync(path.join(directory, file), 'utf8')).join('\n');
  for (const [scenario, tests] of Object.entries(definition.scenario_tests ?? {})) {
    assert(specs.includes(`| ${scenario} |`), `Unknown implemented scenario: ${scenario}`);
    assert(tests.length, `No tests for implemented scenario: ${scenario}`);
    for (const reference of tests) {
      const [file, name] = reference.split('#');
      assert(!path.isAbsolute(file) && !file.split('/').includes('..') && /_test\.go$/.test(file));
      assert(/^Test[A-Za-z0-9_]+$/.test(name));
      const source = fs.readFileSync(path.join(checkout, file), 'utf8');
      assert(source.includes(`func ${name}(t *testing.T)`), `Missing scenario test: ${scenario}/${reference}`);
    }
  }
}
export function contracts(directory = root) {
  const records = inspect(directory);
  const definitions = readJSON(path.join(directory, 'architecture/modules.json')).modules;
  const runtime = records.find(project => project.name === 'platform');
  assert.deepEqual(readJSON(path.join(runtime.directory, 'internal/composition/platform.json')), descriptor('platform'), 'Runtime module descriptor differs from the architecture declaration');
  for (const definition of definitions.filter(module => module.scenario_tests)) {
    const project = records.find(project => project.url === `https://github.com/${definition.repository}.git`);
    assert(project, `Scenario provider checkout missing: ${definition.id}`);
    verifyScenarios(directory, definition, project.directory);
  }
  for (const client of records.filter(project => project.tags.includes('frontend'))) {
    const source = readJSON(path.join(client.directory, 'contracts/platform.source.json'));
    const provider = records.find(project => project.url === `https://github.com/${source.repository}.git`);
    assert(provider, `Provider checkout missing: ${source.repository}`);
    try { git(provider.directory, 'cat-file', '-e', `${source.revision}^{commit}`); }
    catch { execFileSync('git', ['-C', provider.directory, 'fetch', 'origin', source.revision], { stdio: 'inherit' }); }
    verifySource(provider, client, source, (revision, filename) => execFileSync('git', ['-C', provider.directory, 'show', `${revision}:${filename}`], { encoding: 'utf8' }));
    const prior = path.join(client.directory, 'contracts/platform.openapi.yaml');
    const current = path.join(provider.directory, 'contracts/platform.openapi.yaml');
    if (!fs.readFileSync(prior).equals(fs.readFileSync(current))) {
      execFileSync('go', ['run', 'github.com/oasdiff/oasdiff@v1.34.1', 'breaking', prior, current, '--allow-external-refs=false', '--fail-on', 'WARN'], { cwd: provider.directory, env: { ...process.env, GOWORK: 'off' }, stdio: 'inherit' });
    }
  }
  console.log('PASS: client snapshots match their declared provider revision and remain compatible');
}
export function toolchains(directory = root, write = false, remote = false) {
  const versions = readJSON(path.join(directory, 'architecture/toolchains.json'));
  const directories = [directory, ...projects(directory).map(project => project.directory).filter(location => fs.existsSync(path.join(location, '.git')))];
  for (const location of directories) {
    const nodeFile = path.join(location, '.node-version');
    const localeFile = path.join(location, 'locale-policy.json');
    if (fs.existsSync(localeFile)) {
      const source = fs.readFileSync(path.join(directory, 'architecture/locales.json'));
      if (write) fs.writeFileSync(localeFile, source);
      assert(fs.readFileSync(localeFile).equals(source), `Language policy: ${location}`);
    }
    {
      const workflows = path.join(location, '.github/workflows');
      if (fs.existsSync(workflows)) for (const entry of fs.readdirSync(workflows).filter(name => name.endsWith('.yml'))) {
        const filename = path.join(workflows, entry);
        const before = fs.readFileSync(filename, 'utf8');
        const document = YAML.parseDocument(before);
        if (document.errors.length) throw new Error(`${filename}: ${document.errors[0].message}`);
        let changed = false;
        const rootPackageFile = path.join(directory, 'package.json');
        const releaseVersion = fs.existsSync(rootPackageFile) ? readJSON(rootPackageFile).version : undefined;
        const releaseTag = releaseVersion ? toolsTag(releaseVersion) : undefined;
        const coordinatorKey = ['on', 'workflow_call', 'inputs', 'coordinator_ref', 'default'];
        if (releaseTag && document.hasIn(coordinatorKey)) {
          if (write && document.getIn(coordinatorKey) !== releaseTag) { document.setIn(coordinatorKey, releaseTag); changed = true; }
          assert.equal(document.getIn(coordinatorKey), releaseTag, '协调器默认版本必须与工具版本一致。');
        }
        for (const job of document.get('jobs')?.items ?? []) {
          const jobName = job.key.value;
          const workflowKey = ['jobs', jobName, 'uses'];
          if (releaseTag && document.getIn(workflowKey)?.startsWith('StuHelper/stuhelper-next/.github/workflows/integration.yml@')) {
            const expected = `StuHelper/stuhelper-next/.github/workflows/integration.yml@${releaseTag}`;
            if (write && document.getIn(workflowKey) !== expected) { document.setIn(workflowKey, expected); changed = true; }
            assert.equal(document.getIn(workflowKey), expected, `跨仓检查版本不一致：${location}`);
          }
          const steps = document.getIn(['jobs', jobName, 'steps']);
          for (let index = 0; index < (steps?.items.length ?? 0); index++) {
            const prefix = ['jobs', jobName, 'steps', index];
            const uses = document.getIn([...prefix, 'uses']);
            if (uses?.startsWith('astral-sh/setup-uv@')) {
              const key = [...prefix, 'with', 'version'];
              if (write && document.getIn(key) !== versions.uv) { document.setIn(key, versions.uv); changed = true; }
              assert.equal(document.getIn(key), versions.uv, `uv version: ${location}/${entry}`);
            }

          }
        }
        if (changed) fs.writeFileSync(filename, document.toString({ lineWidth: 0 }));
      }
    }
    if (write) fs.writeFileSync(nodeFile, `${versions.node}\n`);
    assert.equal(fs.readFileSync(nodeFile, 'utf8').trim(), versions.node, `Node version: ${location}`);
    const goMod = path.join(location, 'go.mod');
    {
      if (write) fs.writeFileSync(path.join(location, '.go-version'), `${versions.go}\n`);
      assert.equal(fs.readFileSync(path.join(location, '.go-version'), 'utf8').trim(), versions.go);
    }
    if (fs.existsSync(goMod)) {
      if (write) fs.writeFileSync(goMod, fs.readFileSync(goMod, 'utf8').replace(/^go .+$/m, `go ${versions.go}`));
      assert(fs.readFileSync(goMod, 'utf8').includes(`go ${versions.go}\n`));
    }
    const packageFile = path.join(location, 'package.json');
    if (fs.existsSync(packageFile)) {
      const pkg = readJSON(packageFile);
      if (write) {
        pkg.engines = { ...pkg.engines, node: versions.node, pnpm: versions.pnpm };
        pkg.packageManager = `pnpm@${versions.pnpm}`;
        fs.writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);

      }
      const rootPackage = path.join(directory, 'package.json');
      const overrides = fs.existsSync(rootPackage) ? readJSON(rootPackage).pnpm?.overrides ?? {} : {};
      const workspaceFile = path.join(location, 'pnpm-workspace.yaml');
      if (Object.keys(overrides).length && fs.existsSync(workspaceFile)) {
        const workspace = YAML.parseDocument(fs.readFileSync(workspaceFile, 'utf8'));
        if (workspace.errors.length) throw workspace.errors[0];
        let changed = false;
        for (const [name, value] of Object.entries(overrides)) {
          if (write && workspace.getIn(['overrides', name]) !== value) { workspace.setIn(['overrides', name], value); changed = true; }
          assert.equal(workspace.getIn(['overrides', name]), value, `Shared dependency override: ${location}/${name}`);
        }
        if (changed) fs.writeFileSync(workspaceFile, workspace.toString({ lineWidth: 0 }));
      } else if (Object.keys(overrides).length) {
        if (write) {
          pkg.pnpm = { ...pkg.pnpm, overrides: { ...pkg.pnpm?.overrides, ...overrides } };
          fs.writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);
        }
        for (const [name, value] of Object.entries(overrides)) assert.equal(pkg.pnpm?.overrides?.[name], value, `Shared dependency override: ${location}/${name}`);
      }
      assert.equal(pkg.engines?.node, versions.node, `Node engine: ${location}`);
      assert.equal(pkg.packageManager, `pnpm@${versions.pnpm}`, `pnpm version: ${location}`);
      assert.equal(pkg.engines?.pnpm, versions.pnpm, `pnpm engine: ${location}`);
    }
  }
  const lockFile = path.join(directory, 'workspace.lock.json');
  if (!write && fs.existsSync(lockFile) && readJSON(lockFile).engineering_tools) engineeringTools(directory, undefined, false, { remote, locks: true });
  console.log(`PASS: toolchains agree in ${directories.length} checked-out repositories`);
}
export function engineeringTools(directory = root, version, write = false, { remote = false, locks = false } = {}) {
  const lockFile = path.join(directory, 'workspace.lock.json');
  const lock = readJSON(lockFile);
  const selected = version ?? lock.engineering_tools?.version;
  const tag = toolsTag(selected);
  try { git(directory, 'rev-parse', '--verify', `refs/tags/${tag}`); }
  catch { execFileSync('git', ['-C', directory, 'fetch', 'origin', `refs/tags/${tag}:refs/tags/${tag}`], { stdio: 'inherit' }); }
  assert.equal(git(directory, 'cat-file', '-t', `refs/tags/${tag}`), 'tag', '工程工具使用带注释的发行 tag。');
  const revision = git(directory, 'rev-parse', `refs/tags/${tag}^{commit}`);
  if (!write && lock.engineering_tools?.revision) assert.equal(revision, lock.engineering_tools.revision, '本地发行 tag 与记录提交不一致。');
  if (remote) assert.equal(remoteToolsRevision(selected), revision, '远端发行 tag 缺失或已改变。');
  const pkg = readJSON(path.join(directory, 'package.json'));
  assert.equal(pkg.version, selected, '工具包版本必须与发行 tag 一致。');
  const files = ['package.json', ...pkg.files];
  const changed = git(directory, 'diff', '--name-only', revision, '--', ...files);
  const added = git(directory, 'ls-files', '--others', '--exclude-standard', '--', ...files);
  assert(!changed && !added, `Engineering tools differ from ${tag}; prepare a new tool release`);
  const dependency = `git+${toolsRepository}#${tag}`;
  for (const project of projects(directory).filter(project => fs.existsSync(path.join(project.directory, 'package.json')))) {
    const filename = path.join(project.directory, 'package.json');
    const consumer = readJSON(filename);
    if (write) {
      consumer.devDependencies = { ...consumer.devDependencies, '@stuhelper/engineering-tools': dependency };
      fs.writeFileSync(filename, `${JSON.stringify(consumer, null, 2)}\n`);
    }
    assert.equal(consumer.devDependencies?.['@stuhelper/engineering-tools'], dependency, `Engineering tools version differs: ${project.name}`);
    if (locks) checkConsumerRelease(project.directory, selected, revision);
  }
  if (write) {
    lock.engineering_tools = { version: selected, revision };
    fs.writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);
  }
}
export function goWorkspace(directory = root) {
  const versions = readJSON(path.join(directory, 'architecture/toolchains.json'));
  const paths = projects(directory).filter(project => fs.existsSync(path.join(project.directory, 'go.mod'))).map(project => `./${project.path}`);
  assert(paths.length, 'Check out a Go repository with mani sync first');
  const destination = path.join(directory, 'go.work');
  const options = { cwd: directory, env: { ...process.env, GOWORK: destination, GOTOOLCHAIN: `go${versions.go}` }, stdio: 'inherit' };
  if (!fs.existsSync(destination)) execFileSync('go', ['work', 'init'], options);
  execFileSync('go', ['work', 'use', ...paths], options);
}
export function snapshot(directory = root, write = false) {
  const records = inspect(directory);
  assert(records.every(record => !record.dirty), 'Commit code changes before recording an integration combination');
  contracts(directory);
  toolchains(directory);
  const previous = readJSON(path.join(directory, 'workspace.lock.json'));
  const lock = { schema_version: 1, ...(previous.engineering_tools ? { engineering_tools: previous.engineering_tools } : {}), projects: Object.fromEntries(records.map(record => [record.name, { revision: record.revision }])) };
  const json = `${JSON.stringify(lock, null, 2)}\n`;
  if (write) fs.writeFileSync(path.join(directory, 'workspace.lock.json'), json);
  else process.stdout.write(json);
}
const documentationFiles = new Set(['README.md', 'CONTRIBUTING.md', 'AGENTS.md', 'LICENSE', 'mkdocs.yml', 'pyproject.toml', 'uv.lock', '.markdownlint-cli2.yaml']);
export function needsIntegration(files) {
  // The glossary is shipped in the shared tools package and affects consumers.
  return !files.length || files.some(file => file === 'docs/spec/terminology.md' ||
    (!documentationFiles.has(file) && !file.startsWith('docs/')));
}
export function integrationPlan(directory, eventName, event = {}) {
  // A previous push may have been cancelled before verifying its code changes.
  if (eventName !== 'pull_request') return { integration: true, reason: 'Full maintained-branch or manual validation' };
  try {
    const { base, head } = event.pull_request;
    for (const revision of [base.sha, head.sha]) assert.match(revision, /^[0-9a-f]{40}$/);
    const files = git(directory, 'diff', '--name-only', '--no-renames', '-z', `${base.sha}...${head.sha}`, '--').split('\0').filter(Boolean);
    const integration = needsIntegration(files);
    return { integration, reason: integration ? 'PR includes integration inputs or unknown paths' : 'Documentation-only PR' };
  } catch {
    return { integration: true, reason: 'Diff unavailable: full validation' };
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const { positionals: [command, option], values } = parseArgs({ allowPositionals: true, options: {
      write: { type: 'boolean' }, remote: { type: 'boolean' },
      source: { type: 'string', default: 'latest' }, candidates: { type: 'string' },
      replay: { type: 'string' }, 'replay-json': { type: 'string' }, output: { type: 'string' },
      'candidate-repository': { type: 'string' }, 'candidate-revision': { type: 'string' },
    } });
    if (command === 'validate') validate();
    else if (command === 'contracts') contracts();
    else if (command === 'toolchains') toolchains(root, values.write, values.remote);
    else if (command === 'tooling') engineeringTools(root, option, values.write, { remote: values.remote });
    else if (command === 'go-work') goWorkspace();
    else if (command === 'snapshot') snapshot(root, values.write);
    else if (command === 'resolve') {
      const record = await resolveIntegration(root, {
        source: values.source, candidates: values.candidates ? JSON.parse(values.candidates) : {},
        candidateRepository: values['candidate-repository'], candidateRevision: values['candidate-revision'],
        replay: values['replay-json'] ? JSON.parse(values['replay-json']) : values.replay ? readJSON(values.replay) : undefined,
      });
      writeIntegrationRecord(record, values.output);
    } else if (command === 'checkout') checkoutRecord(root, readJSON(values.replay));
    else if (command === 'status') await integrationStatus(root, readJSON(values.replay));
    else if (command === 'affected') {
      if (option) console.log(String(needsIntegration(git(root, 'diff', '--name-only', '--no-renames', '-z', option, 'HEAD', '--').split('\0').filter(Boolean))));
      else {
        const plan = integrationPlan(root, process.env.GITHUB_EVENT_NAME, readJSON(process.env.GITHUB_EVENT_PATH));
        fs.appendFileSync(process.env.GITHUB_OUTPUT, `integration=${plan.integration}\n`);
        fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `Integration selected: **${plan.integration}**. ${plan.reason}.\n`);
        console.log(JSON.stringify(plan));
      }
    }
    else throw new Error('Use validate, contracts, toolchains [--write|--remote], tooling VERSION [--write], go-work, snapshot [--write], resolve, checkout --replay FILE, status --replay FILE, or affected BASE.');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
