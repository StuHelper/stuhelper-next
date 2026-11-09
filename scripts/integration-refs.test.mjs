import assert from 'node:assert/strict';
import { test } from 'node:test';
import { integrationRefs, lockedCandidateSummary } from './integration-refs.mjs';

test('ordinary integration uses develop and candidate PRs require explicit clean source records', () => {
  const projects = Object.fromEntries(['platform', 'web', 'admin', 'catalog', 'reviews', 'moderation', 'storage', 'media', 'resources'].map(name => [name, { repository: `https://github.com/StuHelper/stuhelper-${name}.git`, revision: 'a'.repeat(40), dirty: false }]));
  const env = { GITHUB_EVENT_NAME: 'pull_request', GITHUB_HEAD_REF: 'codex/academic-community' };
  assert.equal(integrationRefs(env, { projects }).catalog, 'a'.repeat(40));
  assert.equal(integrationRefs({...env,GITHUB_HEAD_REF:'feat/backend-decisions'},{projects}).catalog,'a'.repeat(40));
  assert.equal(integrationRefs({ ...env, GITHUB_EVENT_NAME: 'push' }, { projects }).catalog, 'develop');
  assert.equal(integrationRefs({ ...env, GITHUB_HEAD_REF: 'another-task' }, { projects }).catalog, 'develop');
  assert.equal(integrationRefs({ WEB: 'b'.repeat(40) }).web, 'b'.repeat(40));
  assert.throws(() => integrationRefs({ WEB: 'branch\ninjected' }));
  assert.throws(() => integrationRefs(env, {}));
  projects.catalog.dirty = true;
  assert.throws(() => integrationRefs(env, { projects }), /Uncommitted/);
});

test('candidate summary preserves locked providers outside public integration and rejects unsafe records', () => {
  const snapshot = { schema_version: 1, projects: Object.fromEntries(['backend', 'web', 'search', 'qq-binding'].map((name, index) => [name, { repository: `https://github.com/StuHelper/stuhelper-${name}.git`, revision: String(index + 1).repeat(40), dirty: false }])) };
  const summary = lockedCandidateSummary(snapshot);
  for (const [name, record] of Object.entries(snapshot.projects)) assert(summary.includes(`| ${name} | ${record.revision} |`));
  assert(summary.includes('actually checked out and tested are listed separately'));
  assert.throws(() => lockedCandidateSummary({ schema_version: 1, projects: {} }));
  for (const change of [{ dirty: true }, { revision: 'develop' }, { repository: 'https://github.com/other/backend.git' }]) {
    const invalid = structuredClone(snapshot);
    Object.assign(invalid.projects.backend, change);
    assert.throws(() => lockedCandidateSummary(invalid));
  }
});
