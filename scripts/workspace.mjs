import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { readYaml, root } from './architecture.mjs';

const readJSON = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const git = (directory, ...args) => execFileSync('git', ['-C', directory, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
export const projects = (directory = root) => Object.entries(readYaml(path.join(directory, 'mani.yaml')).projects).map(([name, value]) => ({ name, ...value, directory: path.resolve(directory, value.path) }));

export function validate(directory = root) {
  const config = readYaml(path.join(directory, 'mani.yaml'));
  for (const flag of ['sync_remotes', 'sync_gitignore', 'remove_orphaned_worktrees']) assert.equal(config[flag], false, flag);
  assert.equal(config.specs.default.ignore_errors, false);
  assert.equal(config.specs.default.ignore_non_existing, false);
  const modules = readYaml(path.join(directory, 'architecture/modules.yaml'));
  const repositories = new Set([...modules.modules, ...modules.applications, ...modules.operations].map(item => item.repository));
  repositories.add('StuHelper/stuhelper-tooling');
  for (const project of projects(directory)) {
    assert.match(project.name, /^[a-z][a-z-]*$/);
    assert.equal(project.url, `https://github.com/StuHelper/stuhelper-${project.name}.git`);
    assert.equal(project.path, `workspace/${project.name}`);
    assert.equal(project.branch, 'develop');
    assert(repositories.has(`StuHelper/stuhelper-${project.name}`), `Missing repository declaration: ${project.name}`);
    assert(!project.worktrees, 'Use native git worktree for task checkouts');
  }
  toolchains(directory, false, false);
}

export function toolchains(directory = root, write = false, includeCheckouts = true) {
  const versions = readYaml(path.join(directory, 'architecture/toolchains.yaml'));
  const directories = [directory, ...(includeCheckouts ? projects(directory).map(project => project.directory).filter(location => fs.existsSync(path.join(location, '.git'))) : [])];
  for (const location of directories) {
    for (const [file, version] of [['.node-version', versions.node], ['.go-version', versions.go]]) {
      if (write) fs.writeFileSync(path.join(location, file), `${version}\n`);
      assert.equal(fs.readFileSync(path.join(location, file), 'utf8').trim(), version, `${location}/${file}`);
    }
    const pkgFile = path.join(location, 'package.json');
    const pkg = readJSON(pkgFile);
    if (write) {
      pkg.engines = { ...pkg.engines, node: versions.node, pnpm: versions.pnpm };
      pkg.packageManager = `pnpm@${versions.pnpm}`;
      pkg.devDependencies.lefthook = versions.lefthook;
      fs.writeFileSync(pkgFile, `${JSON.stringify(pkg, null, 2)}\n`);
    }
    assert.equal(pkg.engines.node, versions.node, `${location}: node`);
    assert.equal(pkg.engines.pnpm, versions.pnpm, `${location}: pnpm`);
    assert.equal(pkg.packageManager, `pnpm@${versions.pnpm}`, `${location}: packageManager`);
    assert.equal(pkg.devDependencies.lefthook, versions.lefthook, `${location}: lefthook`);
    const setupFile = path.join(location, 'actions/setup/action.yml');
    if (fs.existsSync(setupFile)) {
      const setup = YAML.parseDocument(fs.readFileSync(setupFile, 'utf8'));
      const steps = setup.getIn(['runs', 'steps']);
      const index = steps.items.findIndex(step => step.getIn(['env', 'ACTIONLINT_VERSION']) !== undefined);
      assert(index >= 0, 'Shared setup must declare the workflow linter version');
      const key = ['runs', 'steps', index, 'env', 'ACTIONLINT_VERSION'];
      if (write) { setup.setIn(key, versions.actionlint); fs.writeFileSync(setupFile, setup.toString({ lineWidth: 0 })); }
      assert.equal(setup.getIn(key), versions.actionlint, `${location}: actionlint`);
    }
    const goMod = path.join(location, 'go.mod');
    if (fs.existsSync(goMod)) {
      if (write) fs.writeFileSync(goMod, fs.readFileSync(goMod, 'utf8').replace(/^go .+$/m, `go ${versions.go}`));
      assert(fs.readFileSync(goMod, 'utf8').includes(`go ${versions.go}\n`), `${location}: go.mod`);
    }
    const policy = path.join(location, 'locale-policy.yaml');
    if (fs.existsSync(policy)) {
      const source = fs.readFileSync(path.join(directory, 'architecture/locales.yaml'));
      if (write) {
        fs.writeFileSync(policy, source);
        execFileSync('pnpm', ['exec', 'stuhelper-check', 'locale-policy', '--write'], { cwd: location, stdio: 'inherit' });
      }
      assert(fs.readFileSync(policy).equals(source), `${location}: locale policy`);
    }
  }
  console.log(`PASS: toolchains agree in ${directories.length} checked-out repositories`);
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
  const records = projects(directory).filter(project => ['platform', 'web', 'admin'].includes(project.name));
  const definitions = readYaml(path.join(directory, 'architecture/modules.yaml')).modules;
  const provider = records.find(project => project.name === 'platform');
  const descriptor = readYaml(path.join(provider.directory, 'module.yaml'));
  const definition = definitions.find(module => module.id === 'platform');
  for (const key of ['id', 'api', 'capabilities', 'critical']) assert.deepEqual(descriptor[key], definition[key]);
  for (const definition of definitions.filter(module => module.scenario_tests)) {
    const project = records.find(project => project.url === `https://github.com/${definition.repository}.git`);
    assert(project, `Scenario provider checkout missing: ${definition.id}`);
    verifyScenarios(directory, definition, project.directory);
  }
  for (const client of records.filter(project => project.tags.includes('frontend'))) {
    const source = readJSON(path.join(client.directory, 'contracts/platform.source.json'));
    verifySource(provider, client, source, (revision, filename) => execFileSync('git', ['-C', provider.directory, 'show', `${revision}:${filename}`], { encoding: 'utf8' }));
    const prior = path.join(client.directory, 'contracts/platform.openapi.yaml');
    const current = path.join(provider.directory, 'contracts/platform.openapi.yaml');
    if (!fs.readFileSync(prior).equals(fs.readFileSync(current))) {
      execFileSync('go', ['run', 'github.com/oasdiff/oasdiff@v1.34.1', 'breaking', prior, current, '--allow-external-refs=false', '--fail-on', 'WARN'], { cwd: provider.directory, env: { ...process.env, GOWORK: 'off' }, stdio: 'inherit' });
    }
  }
  console.log('PASS: scenario mappings, client snapshot provenance and API compatibility');
}

export function snapshot(directory = root, write = false) {
  const record = { schema_version: 1, projects: {} };
  for (const project of projects(directory).filter(project => fs.existsSync(path.join(project.directory, '.git')))) {
    assert.equal(fs.realpathSync(git(project.directory, 'rev-parse', '--show-toplevel')), fs.realpathSync(project.directory));
    const canonical = url => url.replace(/^git@github\.com:/, 'https://github.com/').replace(/\.git$/, '').toLowerCase();
    assert.equal(canonical(git(project.directory, 'remote', 'get-url', 'origin')), canonical(project.url), `Unexpected origin: ${project.name}`);
    const dirty = Boolean(git(project.directory, 'status', '--porcelain'));
    assert(!write || !dirty, `Commit candidate changes before recording ${project.name}`);
    record.projects[project.name] = { repository: project.url, revision: git(project.directory, 'rev-parse', 'HEAD'), dirty };
  }
  const rendered = `${JSON.stringify(record, null, 2)}\n`;
  if (write) fs.writeFileSync(path.join(directory, 'workspace.lock.json'), rendered);
  console.log(rendered);
  if (process.env.GITHUB_STEP_SUMMARY) {
    const lines = Object.entries(record.projects).map(([name, value]) => `| ${name} | ${value.revision} | ${value.dirty} |`);
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### Tested source combination\n\n| Repository | Commit | Dirty |\n| --- | --- | --- |\n${lines.join('\n')}\n`);
  }
  return record;
}

export function goWorkspace(directory = root) {
  const version = readYaml(path.join(directory, 'architecture/toolchains.yaml')).go;
  const modules = projects(directory).filter(project => fs.existsSync(path.join(project.directory, 'go.mod')));
  const filename = path.join(directory, 'go.work');
  if (fs.existsSync(filename)) {
    execFileSync('go', ['work', 'edit', `-go=${version}`], { cwd: directory, stdio: 'inherit', env: { ...process.env, GOWORK: filename } });
    execFileSync('go', ['work', 'use', ...modules.map(project => `./${project.path}`)], { cwd: directory, stdio: 'inherit', env: { ...process.env, GOWORK: filename } });
  } else fs.writeFileSync(filename, `go ${version}\n\nuse (\n${modules.map(project => `\t./${project.path}`).join('\n')}\n)\n`);
  console.log(`Created local go.work with ${modules.length} modules; formal builds use GOWORK=off`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const [command, flag] = process.argv.slice(2);
    assert(!flag || flag === '--write', 'Only --write is accepted');
    if (command === 'validate') validate();
    else if (command === 'toolchains') toolchains(root, flag === '--write');
    else if (command === 'contracts') contracts();
    else if (command === 'snapshot') snapshot(root, flag === '--write');
    else if (command === 'go-work') goWorkspace();
    else throw new Error('Use validate, contracts, toolchains [--write], snapshot [--write], or go-work. Use Mani directly for repository tasks.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
