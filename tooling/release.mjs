import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import YAML from 'yaml';

export const toolsRepository = 'https://github.com/StuHelper/stuhelper-next.git';
export function toolsTag(version) {
  assert.match(version, /^\d+\.\d+\.\d+$/, '工具版本必须是完整的 major.minor.patch。');
  return `tooling-v${version}`;
}
export function tagRevision(output, tag) {
  const refs = new Map(output.trim().split('\n').filter(Boolean).map(line => line.trim().split(/\s+/).reverse()));
  const revision = refs.get(`refs/tags/${tag}^{}`);
  assert.match(revision ?? '', /^[0-9a-f]{40}$/, `缺少带注释的发行 tag：${tag}`);
  return revision;
}
export function remoteToolsRevision(version) {
  const tag = toolsTag(version);
  return tagRevision(execFileSync('git', ['ls-remote', '--tags', toolsRepository, `refs/tags/${tag}`, `refs/tags/${tag}^{}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }), tag);
}
export function checkConsumerRelease(directory, version, revision) {
  const pkg = JSON.parse(fs.readFileSync(path.join(directory, 'package.json'), 'utf8'));
  const expected = `git+${toolsRepository}#${toolsTag(version)}`;
  assert.equal(pkg.devDependencies?.['@stuhelper/engineering-tools'], expected, `工程工具版本不一致：${directory}`);
  const lock = YAML.parse(fs.readFileSync(path.join(directory, 'pnpm-lock.yaml'), 'utf8'));
  const dependency = lock.importers?.['.']?.devDependencies?.['@stuhelper/engineering-tools'];
  assert.equal(dependency?.specifier, expected, `工程工具锁文件声明不一致：${directory}`);
  const resolution = lock.packages?.[`@stuhelper/engineering-tools@${dependency.version}`]?.resolution;
  assert(resolution, `工程工具缺少锁定来源：${directory}`);
  if (resolution.type === 'git') {
    assert.equal(resolution.repo, toolsRepository, '公共工具包必须通过 HTTPS 解析；请使用 GIT_SSH_COMMAND=false pnpm update @stuhelper/engineering-tools 重新生成锁文件。');
    assert.equal(resolution.commit, revision, `发行 tag 与锁定提交不一致：${directory}`);
  } else {
    const archive = `https://codeload.github.com/StuHelper/stuhelper-next/tar.gz/${revision}`;
    assert.equal(dependency.version, archive, `发行 tag 与锁定提交不一致：${directory}`);
    assert.equal(resolution.tarball, archive, `工程工具归档来源不一致：${directory}`);
    assert.match(resolution.integrity ?? '', /^sha(?:256|384|512)-/, '工程工具归档必须保留完整性校验。');
  }
}
