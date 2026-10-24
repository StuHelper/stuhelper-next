import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const packageRoot = fileURLToPath(new URL('../', import.meta.url));
export function descriptor(id) {
  const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, 'architecture/modules.json'), 'utf8'));
  const module = manifest.modules.find(module => module.id === id);
  if (!module || module.implementation !== 'framework' || !Number.isInteger(module.api)) throw new Error(`模块 ${id} 尚未声明可运行的接口。`);
  const dependencies = names => names.map(id => {
    const dependency = manifest.modules.find(module => module.id === id);
    if (!Number.isInteger(dependency?.api)) throw new Error(`依赖 ${id} 缺少接口主版本。`);
    return { id, api: dependency.api };
  });
  return { critical: module.critical === true, descriptor: { id, version: 'development', api: module.api, requires: dependencies(module.required), optional: dependencies(module.optional), capabilities: module.capabilities, capability_requires: Object.fromEntries(Object.entries(module.capability_requires).map(([name, ids]) => [name, dependencies(ids)])) } };
}
