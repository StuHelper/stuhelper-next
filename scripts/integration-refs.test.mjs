import assert from 'node:assert/strict';
import { test } from 'node:test';
import { integrationRefs } from './integration-refs.mjs';

test('ordinary integration uses develop and candidate PRs require explicit clean source records', () => {
  const projects = Object.fromEntries(['platform', 'web', 'admin', 'catalog', 'reviews', 'moderation', 'storage', 'media', 'resources'].map(name => [name, { repository: `https://github.com/StuHelper/stuhelper-${name}.git`, revision: 'a'.repeat(40), dirty: false }]));
  const env = { GITHUB_EVENT_NAME: 'pull_request', GITHUB_HEAD_REF: 'codex/academic-community' };
  assert.equal(integrationRefs(env, { projects }).catalog, 'a'.repeat(40));
  assert.equal(integrationRefs({ ...env, GITHUB_EVENT_NAME: 'push' }, { projects }).catalog, 'develop');
  assert.equal(integrationRefs({ ...env, GITHUB_HEAD_REF: 'another-task' }, { projects }).catalog, 'develop');
  assert.equal(integrationRefs({ WEB: 'b'.repeat(40) }).web, 'b'.repeat(40));
  assert.throws(() => integrationRefs({ WEB: 'branch\ninjected' }));
  assert.throws(() => integrationRefs(env, {}));
  projects.catalog.dirty = true;
  assert.throws(() => integrationRefs(env, { projects }), /Uncommitted/);
});
