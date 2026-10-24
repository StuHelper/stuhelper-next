import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

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
export function toolchains(directory = root, write = false) {
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
        const workflow = YAML.parse(before);
        let changed = false;
        for (const job of Object.values(workflow.jobs)) for (const step of job.steps ?? []) {
          if (step.uses?.startsWith('astral-sh/setup-uv@')) {
            if (write && step.with?.version !== versions.uv) { step.with.version = versions.uv; changed = true; }
            assert.equal(step.with?.version, versions.uv, `uv version: ${location}/${entry}`);
          }
          if (step.run?.match(/corepack@\d+\.\d+\.\d+/)) {
            const updated = step.run.replace(/corepack@\d+\.\d+\.\d+/g, `corepack@${versions.corepack}`);
            if (write && updated !== step.run) { step.run = updated; changed = true; }
            assert.equal(step.run, updated, `Corepack version: ${location}/${entry}`);
          }
        }
        if (changed) fs.writeFileSync(filename, YAML.stringify(workflow, { lineWidth: 0 }));
      }
    }
    if (write) fs.writeFileSync(nodeFile, `${versions.node}\n`);
    assert.equal(fs.readFileSync(nodeFile, 'utf8').trim(), versions.node, `Node version: ${location}`);
    const goMod = path.join(location, 'go.mod');
    if (location === directory || fs.existsSync(goMod)) {
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
        pkg.engines = { ...pkg.engines, node: versions.node };
        fs.writeFileSync(packageFile, `${JSON.stringify(pkg, null, 2)}\n`);
        const lockFile = path.join(location, 'package-lock.json');
        if (fs.existsSync(lockFile)) {
          const lock = readJSON(lockFile);
          lock.packages[''].engines = { ...lock.packages[''].engines, node: versions.node };
          fs.writeFileSync(lockFile, `${JSON.stringify(lock, null, 2)}\n`);
        }
      }
      assert.equal(pkg.engines?.node, versions.node, `Node engine: ${location}`);
    }
  }
  console.log(`PASS: toolchains agree in ${directories.length} checked-out repositories`);
}
export function goWorkspace(directory = root) {
  const config = readJSON(path.join(directory, 'architecture/toolchains.json'));
  const paths = projects(directory).filter(project => fs.existsSync(path.join(project.directory, 'go.mod'))).map(project => `\t./${project.path}`);
  assert(paths.length, 'Check out a Go repository with mani sync first');
  const destination = path.join(directory, 'go.work');
  const content = `go ${config.go}\n\nuse (\n${paths.join('\n')}\n)\n`;
  if (fs.existsSync(destination)) assert.equal(fs.readFileSync(destination, 'utf8'), content, 'Existing go.work has custom entries; update it with go work use');
  else fs.writeFileSync(destination, content);
}
export function snapshot(directory = root, write = false) {
  const records = inspect(directory);
  assert(records.every(record => !record.dirty), 'Commit code changes before recording an integration combination');
  contracts(directory);
  toolchains(directory);
  const lock = { schema_version: 1, projects: Object.fromEntries(records.map(record => [record.name, { revision: record.revision }])) };
  const json = `${JSON.stringify(lock, null, 2)}\n`;
  if (write) fs.writeFileSync(path.join(directory, 'workspace.lock.json'), json);
  else process.stdout.write(json);
}
export function checkout(directory = root) {
  const lock = readJSON(path.join(directory, 'workspace.lock.json'));
  assert.equal(lock.schema_version, 1);
  const configured = projects(directory).filter(project => project.tags.includes('code'));
  assert.deepEqual(Object.keys(lock.projects).sort(), configured.map(project => project.name).sort());
  for (const project of configured) {
    const revision = lock.projects[project.name].revision;
    assert.match(revision, /^[0-9a-f]{40}$/);
    assert(!fs.existsSync(project.directory), `Existing checkout preserved: ${project.directory}`);
    execFileSync('git', ['clone', '--no-checkout', '--', project.url, project.directory], { stdio: 'inherit' });
    try { git(project.directory, 'cat-file', '-e', `${revision}^{commit}`); }
    catch { execFileSync('git', ['-C', project.directory, 'fetch', 'origin', revision], { stdio: 'inherit' }); }
    execFileSync('git', ['-C', project.directory, 'checkout', '--detach', revision], { stdio: 'inherit' });
  }
}
export function needsIntegration(files) {
  return files.some(file => /^(architecture\/|scripts\/|tests\/|\.github\/|mani\.yaml$|workspace\.lock\.json$|package(?:-lock)?\.json$|playwright\.config\.mjs$|Makefile$|\.node-version$|\.go-version$)/.test(file));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, option] = process.argv.slice(2);
    if (command === 'validate') validate();
    else if (command === 'contracts') contracts();
    else if (command === 'toolchains') toolchains(root, option === '--write');
    else if (command === 'go-work') goWorkspace();
    else if (command === 'snapshot') snapshot(root, option === '--write');
    else if (command === 'checkout') checkout();
    else if (command === 'affected') console.log(String(needsIntegration(git(root, 'diff', '--name-only', option, 'HEAD').split('\n'))));
    else throw new Error('Use validate, contracts, toolchains [--write], go-work, snapshot [--write], checkout, or affected BASE');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
