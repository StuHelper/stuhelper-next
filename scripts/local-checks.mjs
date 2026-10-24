import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const git = (directory, args, env = process.env) => execFileSync('git', ['-C', directory, ...args], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
function cleanGitEnvironment(directory) {
  const env = { ...process.env };
  for (const key of git(directory, ['rev-parse', '--local-env-vars']).split('\n')) delete env[key];
  return env;
}

export function withSnapshot(directory, revision, inspect) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-check-'));
  const target = path.join(temp, 'source');
  const env = cleanGitEnvironment(directory);
  try {
    // A local clone borrows objects read-only and retains real commits/dates.
    execFileSync('git', ['clone', '--shared', '--no-checkout', '--quiet', '--', directory, target], { env, stdio: 'pipe' });
    const head = git(directory, ['rev-parse', '--verify', `${revision || 'HEAD'}^{commit}`]);
    if (revision) git(target, ['checkout', '--detach', '--quiet', head], env);
    else {
      git(target, ['update-ref', 'HEAD', head], env);
      // Read the original index, including partial staging and force-added files.
      git(directory, ['checkout-index', '--all', `--prefix=${target}/`]);
      git(target, ['add', '--force', '--all'], env);
    }
    return inspect(target, env);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
}

export function pushedCommits(input) {
  const commits = new Map();
  for (const line of input.trim().split('\n').filter(Boolean)) {
    const [, local, , remote] = line.trim().split(/\s+/);
    if (!/^[0-9a-f]{40}$/.test(local) || !/^[0-9a-f]{40}$/.test(remote)) throw new Error('Invalid pre-push ref record');
    if (!/^0+$/.test(local)) commits.set(local, remote);
  }
  return [...commits].map(([revision, base]) => ({ revision, base }));
}

export function installHooks(directory = root) {
  const env = cleanGitEnvironment(directory);
  const current = spawnSync('git', ['-C', directory, 'config', '--get', 'core.hooksPath'], { env, encoding: 'utf8' }).stdout.trim();
  if (current && current !== '.githooks') throw new Error(`Existing core.hooksPath=${current}; integrate hooks manually.`);
  const hooks = path.resolve(directory, git(directory, ['rev-parse', '--git-path', 'hooks'], env));
  if (!current && fs.existsSync(hooks) && fs.readdirSync(hooks).some(name => !name.endsWith('.sample'))) throw new Error('Existing hooks found; integrate them manually.');
  git(directory, ['config', '--local', 'core.hooksPath', '.githooks'], env);
  console.log('Enabled .githooks for this clone and its linked worktrees.');
}

function run(directory, env, command, args) {
  execFileSync(command, args, { cwd: directory, env, stdio: 'inherit' });
}
export function check(directory = root, revision, base) {
  return withSnapshot(directory, revision, (target, env) => {
    if (!revision) {
      const dependencies = path.join(directory, 'node_modules');
      if (!fs.existsSync(dependencies)) throw new Error('Install locked tools first: pnpm install --frozen-lockfile');
      fs.symlinkSync(dependencies, path.join(target, 'node_modules'), 'dir');
      env.DOCS_BASE_REF = 'HEAD';
      run(target, env, 'node', ['tooling/cli.mjs', 'repository']);
      run(target, env, 'python3', ['-B', 'scripts/check.py']);
      run(target, env, 'pnpm', ['run', 'check:docs']);
    } else {
      let comparison = base && !/^0+$/.test(base) ? base : 'origin/develop';
      try { git(target, ['rev-parse', '--verify', `${comparison}^{commit}`], env); }
      catch { comparison = '0'.repeat(40); }
      env.DOCS_BASE_REF = comparison;
      env.GOWORK = 'off';
      run(target, env, 'pnpm', ['install', '--frozen-lockfile', '--ignore-scripts']);
      run(target, env, 'make', ['check']);
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const mode = process.argv[2];
    if (mode === 'install') installHooks();
    else if (mode === 'commit') check();
    else if (mode === 'push') for (const { revision, base } of pushedCommits(fs.readFileSync(0, 'utf8'))) check(root, revision, base);
    else throw new Error('Use local-checks.mjs install, commit or push');
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
