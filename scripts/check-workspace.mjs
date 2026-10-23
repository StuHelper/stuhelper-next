import assert from 'node:assert/strict';
import fs from 'node:fs';
import YAML from 'yaml';

const publicConfig = YAML.parse(fs.readFileSync('mani.yaml', 'utf8'));
const privateConfig = YAML.parse(fs.readFileSync('mani.private.yaml', 'utf8'));
for (const config of [publicConfig, privateConfig]) {
  assert.equal(config.sync_remotes, false, 'Workspace must preserve existing remotes');
  assert.equal(config.remove_orphaned_worktrees, false, 'Workspace must preserve worktrees');
  assert.equal(config.sync_gitignore, false, 'Gitignore changes must be reviewed');
  for (const [name, project] of Object.entries(config.projects)) {
    assert.equal(project.url, `https://github.com/StuHelper/stuhelper-${name}.git`);
    assert.equal(project.path, `workspace/${name}`);
    assert.equal(project.branch, 'develop', 'Development checkout must use the maintained branch');
    assert(!project.worktrees, 'Task worktrees must not be globally created or pruned by sync');
  }
}
assert.deepEqual(Object.keys(publicConfig.projects).sort(), ['admin', 'platform', 'web']);
assert(Object.values(publicConfig.projects).every(project => project.tags.includes('public') && !project.tags.includes('private')));
assert(Object.values(privateConfig.projects).every(project => project.tags.includes('private')));
assert.deepEqual(privateConfig.import, ['./mani.yaml']);
assert.equal(publicConfig.specs.default.ignore_errors, false);
assert.equal(publicConfig.specs.default.ignore_non_existing, false);
console.log('PASS: Mani public/private checkout boundaries and non-destructive defaults');
