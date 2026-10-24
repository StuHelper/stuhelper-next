#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { parseArgs } from 'node:util';
import { checkDocs } from './docs/check-docs.mjs';
import { lintMarkdown } from './docs/lint-markdown.mjs';
import { descriptor } from './modules.mjs';
import { check as checkI18n } from './i18n/check-i18n.mjs';
import { integrationInputs } from './integration-inputs.mjs';
import { checkConsumerRelease, remoteToolsRevision } from './release.mjs';

const packageRoot = fileURLToPath(new URL('../', import.meta.url));
const versions = JSON.parse(fs.readFileSync(path.join(packageRoot, 'architecture/toolchains.json'), 'utf8'));
const run = (command, args, extra = {}) => {
  const result = spawnSync(command, args, { cwd: process.cwd(), stdio: 'inherit', ...extra });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

try {
  const { positionals } = parseArgs({ allowPositionals: true, options: {} });
  const [command, id] = positionals;
  if (command === 'docs') {
    const errors = [...await lintMarkdown(process.cwd()), ...checkDocs(process.cwd()).errors];
    if (errors.length) throw new Error(errors.join('\n'));
    console.log('PASS: documentation formatting, metadata, links and project rules');
  } else if (command === 'i18n') checkI18n(process.cwd());
  else if (command === 'repository') run('python3', ['-B', path.join(packageRoot, 'tooling/check_repository.py')]);
  else if (command === 'workflows') {
    run('go', ['run', `github.com/rhysd/actionlint/cmd/actionlint@v${versions.actionlint}`, '-color', '-shellcheck=', '-pyflakes='], { env: { ...process.env, GOWORK: 'off', GOTOOLCHAIN: `go${versions.go}` } });
    console.log(`PASS: actionlint ${versions.actionlint}`);
  } else if (command === 'release') {
    const version = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8')).version;
    checkConsumerRelease(process.cwd(), version, remoteToolsRevision(version));
    console.log(`PASS: engineering tools ${version}, release tag and locked commit`);
  } else if (command === 'integration-inputs') {
    const candidates = integrationInputs(process.cwd(), process.env.GITHUB_EVENT_NAME, process.env.PR_NUMBER);
    const output = JSON.stringify(candidates);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `candidates=${output}\n`);
    console.log(output);
  } else if (command === 'descriptor') process.stdout.write(`${JSON.stringify(descriptor(id), null, 2)}\n`);
  else throw new Error('Use docs, i18n, repository, workflows, release, integration-inputs, or descriptor MODULE.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
