import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import YAML from 'yaml';

// Exercise the actual workflow loops with native Mani, before running module code.
const workflow=YAML.parse(fs.readFileSync('.github/workflows/integration.yml','utf8'));
for (const id of ['install-combination','check-combination']) test(`${id} preserves failure and stops before the next project`,t=>{
  const directory=fs.mkdtempSync(path.join(os.tmpdir(),'stuhelper-mani-exit-'));
  t.after(()=>fs.rmSync(directory,{recursive:true,force:true}));
  for(const name of ['first','second'])fs.mkdirSync(path.join(directory,'workspace',name),{recursive:true});
  fs.writeFileSync(path.join(directory,'mani.yaml'),'shell: bash\nprojects:\n  first:\n    path: workspace/first\n  second:\n    path: workspace/second\nspecs:\n  default:\n    parallel: false\n    ignore_errors: false\ntasks:\n  setup:\n    cmd: sh task.sh\n  check:\n    cmd: sh task.sh\n');
  fs.writeFileSync(path.join(directory,'workspace.lock.json'),JSON.stringify({projects:{first:{},second:{}}}));
  fs.writeFileSync(path.join(directory,'workspace/first/task.sh'),'exit 37\n');
  fs.writeFileSync(path.join(directory,'workspace/second/task.sh'),'touch executed\n');
  const step=workflow.jobs.integration.steps.find(step=>step.id===id);
  const loop=step.run.slice(step.run.indexOf('projects=')).split('          node scripts/')[0];
  // The source YAML strips indentation; only the native project loop is tested.
  const command=loop.slice(0,loop.indexOf('\ndone')+'\ndone'.length);
  assert(command.includes('--tty'));
  const failed=spawnSync('bash',['-e','-c',command],{cwd:directory,encoding:'utf8'});
  assert.equal(failed.status,37,failed.stderr);
  assert(!fs.existsSync(path.join(directory,'workspace/second/executed')));
  fs.writeFileSync(path.join(directory,'workspace/first/task.sh'),'exit 0\n');
  const passed=spawnSync('bash',['-e','-c',command],{cwd:directory,encoding:'utf8'});
  assert.equal(passed.status,0,passed.stderr);
  assert(fs.existsSync(path.join(directory,'workspace/second/executed')));
});
