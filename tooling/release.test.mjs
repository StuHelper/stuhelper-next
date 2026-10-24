import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { toolsTag, tagRevision, checkConsumerRelease } from './release.mjs';
import { integrationInputs } from './integration-inputs.mjs';

test('release references require annotated version tags and the locked commit', t => {
  const revision = 'a'.repeat(40), tag = toolsTag('0.1.0');
  assert.equal(tagRevision(`${'b'.repeat(40)}\trefs/tags/${tag}\n${revision}\trefs/tags/${tag}^{}\n`, tag), revision);
  assert.throws(() => tagRevision(`${revision}\trefs/tags/${tag}\n`, tag), /缺少带注释/);
  assert.throws(() => toolsTag('latest'), /完整/);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-release-'));
  t.after(() => fs.rmSync(directory, { recursive: true }));
  const dependency = `git+https://github.com/StuHelper/stuhelper-next.git#${tag}`;
  fs.writeFileSync(path.join(directory, 'package.json'), JSON.stringify({ devDependencies: { '@stuhelper/engineering-tools': dependency } }));
  const archive = `https://codeload.github.com/StuHelper/stuhelper-next/tar.gz/${revision}`;
  const lock = { importers: { '.': { devDependencies: { '@stuhelper/engineering-tools': { specifier: dependency, version: archive } } } }, packages: { [`@stuhelper/engineering-tools@${archive}`]: { resolution: { tarball: archive, integrity: 'sha512-test' } } } };
  const write = () => fs.writeFileSync(path.join(directory, 'pnpm-lock.yaml'), JSON.stringify(lock));
  write();
  checkConsumerRelease(directory, '0.1.0', revision);
  assert.throws(() => checkConsumerRelease(directory, '0.1.0', 'c'.repeat(40)), /tag 与锁定提交不一致/);
  const gitVersion = `git+https://github.com/StuHelper/stuhelper-next.git#${revision}`;
  lock.importers['.'].devDependencies['@stuhelper/engineering-tools'].version = gitVersion;
  lock.packages = { [`@stuhelper/engineering-tools@${gitVersion}`]: { resolution: { type: 'git', repo: 'https://github.com/StuHelper/stuhelper-next.git', commit: revision } } };
  write();
  checkConsumerRelease(directory, '0.1.0', revision);
  assert.throws(() => checkConsumerRelease(directory, '0.1.0', 'c'.repeat(40)), /tag 与锁定提交不一致/);
  lock.packages[`@stuhelper/engineering-tools@${gitVersion}`].resolution.repo = 'git@github.com:StuHelper/stuhelper-next.git';
  write();
  assert.throws(() => checkConsumerRelease(directory, '0.1.0', revision), /必须通过 HTTPS/);
});

test('paired candidates apply only to their declared PR and reject unsupported inputs', t => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'stuhelper-candidates-'));
  t.after(() => fs.rmSync(directory, { recursive: true }));
  fs.mkdirSync(path.join(directory, '.github'));
  const file = path.join(directory, '.github/integration.json');
  fs.writeFileSync(file, JSON.stringify({ pull_request: 2, candidates: { architecture: 'pr:3', platform: 'pr:2' } }));
  assert.deepEqual(integrationInputs(directory, 'pull_request', '2'), { architecture: 'pr:3', platform: 'pr:2' });
  assert.deepEqual(integrationInputs(directory, 'pull_request', '4'), {});
  assert.deepEqual(integrationInputs(directory, 'push', '2'), {});
  fs.writeFileSync(file, JSON.stringify({ pull_request: 2, candidates: { other: 'pr:3' } }));
  assert.throws(() => integrationInputs(directory, 'pull_request', '2'), /未知候选仓库/);
});
