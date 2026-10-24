import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import test from 'node:test';
import YAML from 'yaml';
import { integrationPlan, needsIntegration } from './workspace.mjs';
import { cacheBytes, eligible } from './ci-cache.mjs';

const workflow = YAML.parse(fs.readFileSync('.github/workflows/ci.yml', 'utf8'));
const integrationWorkflow = YAML.parse(fs.readFileSync('.github/workflows/integration.yml', 'utf8'));
test('required status rejects failure, cancellation, absent output and unintended skips', () => {
  const gate = workflow.jobs.required;
  assert.equal(gate.name, 'Repository checks');
  assert.deepEqual(gate.needs, ['repository', 'integration']);
  assert.equal(gate.if, 'always()');
  for (const repository of ['success', 'failure', 'cancelled', 'skipped']) {
    for (const selected of ['true', 'false', '']) for (const integration of ['success', 'failure', 'cancelled', 'skipped']) {
      const expected = repository === 'success' && ((selected === 'true' && integration === 'success') || (selected === 'false' && integration === 'skipped'));
      const result = spawnSync('bash', ['-e', '-c', gate.steps[0].run], { env: { ...process.env, REPOSITORY_RESULT: repository, INTEGRATION_SELECTED: selected, INTEGRATION_RESULT: integration } });
      assert.equal(result.status === 0, expected, `${repository}/${selected}/${integration}`);
    }
  }
});
test('public PRs get a required status and superseded runs share a concurrency group', () => {
  assert(!workflow.on.pull_request.paths && !workflow.on.pull_request['paths-ignore']);
  assert.deepEqual(workflow.on.push.branches, ['develop', 'main']);
  assert.equal(workflow.concurrency['cancel-in-progress'], true);
  assert(workflow.concurrency.group.includes('github.event_name'));
  assert(workflow.concurrency.group.includes('github.event.pull_request.number || github.ref'));
  assert.equal(workflow.jobs.integration.if, "needs.repository.outputs.integration == 'true'");
  assert.equal(workflow.on.workflow_dispatch.inputs.combination.default, 'latest');
});
test('toolchain files and pnpm locks drive optional caches; PRs do not save shared entries', () => {
  for (const [job, prefix] of [[workflow.jobs.repository, 'repository'], [integrationWorkflow.jobs.integration, 'framework'], [integrationWorkflow.jobs.integration, 'go']]) {
    const size = job.steps.find(step => step.id === `${prefix}-size`);
    const restore = job.steps.find(step => step.id === `${prefix}-cache`);
    const save = job.steps.find(step => step.uses?.startsWith('actions/cache/save@') && step.if === `steps.${prefix}-size.outputs.save == 'true'`);
    assert(size.if.includes("github.event_name != 'pull_request'"));
    assert(size.if.includes("github.ref == 'refs/heads/develop'"));
    assert(restore.with.key.includes('architecture/toolchains.json'));
    assert(!restore.with.key.includes('github.sha') && !restore.with.key.includes('package-lock.json'));
    assert.equal(restore['continue-on-error'], true);
    assert.equal(save['continue-on-error'], true);
    assert.equal(restore.with['restore-keys'], undefined);
  }
  for (const job of [workflow.jobs.repository, integrationWorkflow.jobs.integration]) for (const step of job.steps) {
    if (step.uses?.startsWith('actions/setup-go@')) assert.match(step.with['go-version-file'], /^(source\/)?\.go-version$/);
    if (step.uses?.startsWith('actions/setup-node@')) assert.match(step.with['node-version-file'], /^(coordinator\/|source\/)?\.node-version$/);
  }
});
test('reusable integration preserves candidates and replay without requiring new scripts in old sources', () => {
  const call = workflow.jobs.integration;
  assert.equal(call.uses, './.github/workflows/integration.yml');
  assert(call.with.candidates.includes('needs.repository.outputs.candidates'));
  assert(call.with.replay.includes('inputs.replay'));
  assert(call.with.coordinator_ref.includes('github.sha'));
  const steps = integrationWorkflow.jobs.integration.steps;
  const coordinator = steps.find(step => step.with?.path === 'coordinator');
  assert(coordinator.with.ref.includes('fromJSON(inputs.replay).coordinator.revision'));
  const source = steps.find(step => step.with?.path === 'source');
  assert(source.with.ref.includes('steps.sources.outputs.architecture_revision'));
  const checkoutIndex = steps.findIndex(step => step.run?.includes('checkout --replay'));
  assert(checkoutIndex < steps.findIndex(step => step.id === 'framework-cache'));
  assert(steps.some(step => step.run?.includes('--candidates "$CANDIDATES"')));
  assert(steps.some(step => step.run?.includes('--replay-json "$REPLAY"')));
  for (const step of steps) {
    assert(!step.run?.includes('scripts/ci-cache.mjs'));
    if (step.run?.includes('tests/ci/mani-exit.mjs')) assert(step.run.includes('if [[ -f tests/ci/mani-exit.mjs ]]'));
    if (step['continue-on-error']) assert(step.uses?.startsWith('actions/cache/'));
  }
});
test('glossary, unknown paths, empty diff and code after 400 documents require integration', () => {
  assert.equal(needsIntegration(['README.md', 'docs/spec/academic-content.md']), false);
  for (const files of [[], ['docs/spec/terminology.md'], ['future/styles.css'], ['pnpm-lock.yaml'], Array.from({length: 400}, (_, i) => `docs/${i}.md`).concat('source.go')]) assert.equal(needsIntegration(files), true);
  for (const event of ['push', 'workflow_dispatch']) assert.equal(integrationPlan('.', event, {}).integration, true);
  assert.equal(integrationPlan('.', 'pull_request', {}).integration, true);
});
test('PR selection covers earlier commits, removed paths and unavailable history', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-ci-plan-'));
  t.after(() => fs.rmSync(root, {recursive:true,force:true}));
  const git = (...args) => execFileSync('git', ['-C', root, ...args], {encoding:'utf8', stdio:'pipe'}).trim();
  const commit = () => {git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','fixture');return git('rev-parse','HEAD');};
  git('init','-q');fs.writeFileSync(path.join(root,'README.md'),'base\n');const base=commit();
  fs.writeFileSync(path.join(root,'source.go'),'package fixture\n');const code=commit();
  fs.writeFileSync(path.join(root,'README.md'),'followup\n');const head=commit();
  const event=(before,after)=>({pull_request:{base:{sha:before},head:{sha:after}}});
  assert.equal(integrationPlan(root,'pull_request',event(base,head)).integration,true);
  assert.equal(integrationPlan(root,'pull_request',event(code,head)).integration,false);
  fs.mkdirSync(path.join(root,'docs'));git('mv','source.go','docs/moved.md');const moved=commit();
  assert.equal(integrationPlan(root,'pull_request',event(head,moved)).integration,true);
  assert.equal(integrationPlan(root,'pull_request',event('f'.repeat(40),moved)).integration,true);
});
test('cache bounds reject empty and oversized entries without traversing symlinks', t => {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'stuhelper-cache-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  fs.writeFileSync(path.join(root,'file'),'123');fs.symlinkSync(root,path.join(root,'outside'),'dir');
  assert.equal(cacheBytes(root),3);
  assert.equal(eligible(0,1),false);assert.equal(eligible(1024**2,1),true);assert.equal(eligible(1024**2+1,1),false);
});
test('reusable cache upload guard enforces actual file bytes for empty and oversized directories', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-integration-cache-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  for (const prefix of ['framework', 'go']) {
    const directory = path.join(root, `next-${prefix}`);
    fs.mkdirSync(directory);
    fs.symlinkSync(root, path.join(directory, 'outside'), 'dir');
    const step = integrationWorkflow.jobs.integration.steps.find(step => step.id === `${prefix}-size`);
    const output = path.join(root, `${prefix}.output`);
    for (const [bytes, expected] of [[0, false], [2147483648, true], [2147483649, false]]) {
      if (bytes) {
        const fd = fs.openSync(path.join(directory, 'sparse'), 'w');
        fs.ftruncateSync(fd, bytes); fs.closeSync(fd);
      }
      fs.writeFileSync(output, '');
      const result = spawnSync('bash', ['-e', '-o', 'pipefail', '-c', step.run], {
        env: {...process.env, RUNNER_TEMP: root, GITHUB_OUTPUT: output, GITHUB_STEP_SUMMARY: path.join(root, 'summary')}, encoding: 'utf8',
      });
      assert.equal(result.status, 0, result.stderr);
      assert.equal(fs.readFileSync(output, 'utf8'), `save=${expected}\n`);
    }
  }
});
test('replay without a coordinator probe still verifies native task exit codes', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-old-coordinator-'));
  t.after(() => fs.rmSync(root, {recursive: true, force: true}));
  const bin = path.join(root, 'bin'); fs.mkdirSync(bin);
  const executable = path.join(bin, 'mani');
  const step = integrationWorkflow.jobs.integration.steps.find(step => step.name === 'Verify native task failure propagation');
  for (const code of [37, 0]) {
    fs.writeFileSync(executable, `#!/bin/sh\nexit ${code}\n`, {mode: 0o755});
    const result = spawnSync('bash', ['-e', '-c', step.run], {cwd: root, env: {...process.env, PATH: `${bin}:${process.env.PATH}`}, encoding: 'utf8'});
    assert.equal(result.status === 0, code === 37, result.stderr);
  }
});
