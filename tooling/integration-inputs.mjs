import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

export function integrationInputs(directory, eventName, pullNumber) {
  const file = path.join(directory, '.github/integration.json');
  if (!fs.existsSync(file)) return {};
  const config = JSON.parse(fs.readFileSync(file, 'utf8'));
  assert(Number.isSafeInteger(config.pull_request) && config.pull_request > 0, '配套检查必须明确所属 PR 编号。');
  assert(config.candidates && !Array.isArray(config.candidates) && typeof config.candidates === 'object', '配套候选必须是对象。');
  for (const [name, selector] of Object.entries(config.candidates)) {
    assert(['architecture', 'platform', 'web', 'admin'].includes(name), `未知候选仓库：${name}`);
    assert(typeof selector === 'string' && /^(?:[0-9a-f]{40}|pr:[1-9]\d*)$/.test(selector), `无效候选来源：${name}`);
  }
  return eventName === 'pull_request' && Number(pullNumber) === config.pull_request ? config.candidates : {};
}
