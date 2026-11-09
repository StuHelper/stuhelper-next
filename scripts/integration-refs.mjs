import assert from 'node:assert/strict';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const modules = ['platform', 'web', 'admin', 'catalog', 'reviews', 'moderation', 'storage', 'media', 'resources'];
const isCandidatePR = env => env.GITHUB_EVENT_NAME === 'pull_request' && ['codex/academic-community','codex/resource-design','feat/backend-decisions'].includes(env.GITHUB_HEAD_REF);
export function integrationRefs(env, snapshot) {
  const candidatePR = isCandidatePR(env);
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

export function lockedCandidateSummary(snapshot) {
  assert.equal(snapshot?.schema_version, 1);
  const entries = Object.entries(snapshot.projects ?? {});
  assert(entries.length, 'Missing locked candidates');
  const rows = entries.map(([name, record]) => {
    assert.match(name, /^[a-z][a-z-]*$/);
    assert.equal(record.repository, `https://github.com/StuHelper/stuhelper-${name}.git`);
    assert.equal(record.dirty, false, `Uncommitted ${name} candidate`);
    assert.match(record.revision, /^[a-f0-9]{40}$/);
    return `| ${name} | ${record.revision} |`;
  });
  return `### Locked candidate combination\n\nFrom workspace.lock.json. The repositories actually checked out and tested are listed separately in Tested source combination.\n\n| Repository | Commit |\n| --- | --- |\n${rows.join('\n')}\n`;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const snapshot = fs.existsSync('workspace.lock.json') ? JSON.parse(fs.readFileSync('workspace.lock.json', 'utf8')) : undefined;
  const refs = integrationRefs(process.env, snapshot);
  if (process.env.GITHUB_STEP_SUMMARY && isCandidatePR(process.env)) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lockedCandidateSummary(snapshot));
  }
  for (const [name, ref] of Object.entries(refs)) {
    console.log(`${name}: ${ref}`);
    if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${ref}\n`);
  }
}
