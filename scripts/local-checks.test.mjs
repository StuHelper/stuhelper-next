import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import test from 'node:test';
import { checkDocs } from '../tooling/docs/check-docs.mjs';
import { installHooks, pushedCommits, withSnapshot } from './local-checks.mjs';

function fixture(t) {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'stuhelper-hook-'));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
  const git=(...args)=>execFileSync('git',['-C',root,...args],{encoding:'utf8',stdio:'pipe',env:{...process.env,GIT_AUTHOR_DATE:'2026-10-23T17:00:00Z',GIT_COMMITTER_DATE:'2026-10-23T17:00:00Z'}}).trim();
  git('init','-q','-b','develop');
  fs.mkdirSync(path.join(root,'docs/spec'),{recursive:true});
  fs.writeFileSync(path.join(root,'.gitignore'),'.env.*\n');
  fs.writeFileSync(path.join(root,'.markdownlint-cli2.yaml'),"globs: ['**/*.md']\nignores: ['**/.git/**']\n");
  fs.writeFileSync(path.join(root,'docs/spec/a.md'),'---\ntype: spec\nstatus: Accepted\nupdated: 2026-10-24\n---\n\n# A\n');
  git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','base');
  return {root,git,head:git('rev-parse','HEAD')};
}
test('staged snapshot retains HEAD history, partial staging, ignored tracked paths and original index', t => {
  const {root,git,head}=fixture(t);
  const file=path.join(root,'docs/spec/a.md');const before=fs.readFileSync(file,'utf8');
  fs.writeFileSync(file,before+'\nStaged.\n');git('add','.');fs.writeFileSync(file,before+'\nUnstaged.\n');
  fs.writeFileSync(path.join(root,'.env.fixture'),'synthetic\n');git('add','-f','.env.fixture');
  fs.writeFileSync(path.join(root,'.env.untracked'),'not staged\n');
  const status=git('status','--porcelain');let exported;
  withSnapshot(root,undefined,(target,env)=>{
    exported=target;
    assert.equal(execFileSync('git',['-C',target,'rev-parse','HEAD'],{env,encoding:'utf8'}).trim(),head);
    assert(fs.readFileSync(path.join(target,'docs/spec/a.md'),'utf8').includes('Staged.'));
    assert(!fs.existsSync(path.join(target,'.env.untracked')));
    execFileSync('git',['-C',target,'ls-files','--error-unmatch','.env.fixture'],{env,stdio:'pipe'});
    assert.deepEqual(checkDocs(target,{base:'HEAD',now:Date.parse('2026-10-24T12:00:00Z')}).errors,[]);
  });
  assert(!fs.existsSync(exported));assert.equal(git('status','--porcelain'),status);assert(fs.readFileSync(file,'utf8').includes('Unstaged.'));
});
test('pushed revision uses original content dates and source, independent of current HEAD or dirty edits', t => {
  const {root,git,head}=fixture(t);
  fs.writeFileSync(path.join(root,'local.txt'),'new commit');git('add','.');git('-c','user.name=Fixture','-c','user.email=fixture@example.test','commit','-qm','later');
  fs.writeFileSync(path.join(root,'docs/spec/a.md'),'dirty uncommitted');
  withSnapshot(root,head,(target)=>{
    assert(!fs.existsSync(path.join(target,'local.txt')));
    assert.deepEqual(checkDocs(target,{base:'0'.repeat(40),now:Date.parse('2026-11-24T12:00:00Z')}).errors,[]);
  });
  assert.equal(fs.readFileSync(path.join(root,'docs/spec/a.md'),'utf8'),'dirty uncommitted');
});
test('snapshot cleanup runs even when a check fails', t => {
  const {root}=fixture(t);let exported;
  assert.throws(()=>withSnapshot(root,undefined,target=>{exported=target;throw new Error('test failure');}),/test failure/);
  assert(!fs.existsSync(exported));
});
test('pre-push handles deletion, multiple refs, duplicate commits and invalid records',()=>{
  const sha='a'.repeat(40), zero='0'.repeat(40);
  const line=`refs/heads/local ${sha} refs/heads/remote ${zero}\n`;
  assert.deepEqual(pushedCommits(line+line+`(delete) ${zero} refs/heads/old ${sha}\n`),[{revision:sha,base:zero}]);
  assert.throws(()=>pushedCommits('bad input'),/Invalid/);
});
test('hook installation preserves custom paths and pre-existing native hooks',t=>{
  const {root,git}=fixture(t);
  git('config','--local','core.hooksPath','custom');assert.throws(()=>installHooks(root),/Existing core.hooksPath/);assert.equal(git('config','--get','core.hooksPath'),'custom');
  git('config','--local','--unset','core.hooksPath');fs.writeFileSync(path.join(root,'.git/hooks/pre-commit'),'existing');
  assert.throws(()=>installHooks(root),/Existing hooks/);fs.unlinkSync(path.join(root,'.git/hooks/pre-commit'));
  installHooks(root);assert.equal(git('config','--local','--get','core.hooksPath'),'.githooks');
});
