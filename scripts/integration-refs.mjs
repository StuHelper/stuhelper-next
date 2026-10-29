import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const modules = ['platform', 'web', 'admin', 'catalog', 'reviews', 'moderation', 'storage', 'media', 'resources'];
export function integrationRefs(env, snapshot) {
  const candidatePR = env.GITHUB_EVENT_NAME === 'pull_request' && ['codex/academic-community','codex/resource-design'].includes(env.GITHUB_HEAD_REF);
  const refs = {};
  for (const name of modules) {
    const explicit = env[name.toUpperCase()] || '';
    if (explicit) assert.match(explicit, /^[a-f0-9]{40}$/, `Invalid ${name} candidate`);
    let revision = explicit || 'develop';
    if (!explicit && candidatePR) {
      const record = snapshot?.projects?.[name];
      assert.equal(record?.repository, `https://github.com/StuHelper/stuhelper-${name}.git`);
      assert.equal(record?.dirty, false, `Uncommitted ${name} candidate`);
      assert.match(record?.revision ?? '', /^[a-f0-9]{40}$/, `Missing ${name} candidate`);
      revision = record.revision;
    }
    refs[name] = revision;
  }
  return refs;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const snapshot = fs.existsSync('workspace.lock.json') ? JSON.parse(fs.readFileSync('workspace.lock.json', 'utf8')) : undefined;
  const refs = integrationRefs(process.env, snapshot);
  for (const [name, ref] of Object.entries(refs)) {
    console.log(`${name}: ${ref}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${ref}\n`);
  }
}
