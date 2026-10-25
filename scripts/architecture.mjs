import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const readYaml = file => YAML.parse(fs.readFileSync(file, 'utf8'));

export function validateModules(config) {
  assert.equal(config.schema_version, 2);
  assert.equal(config.repository_model, 'modular-multi-repo');
  assert(['design-only', 'framework-in-progress', 'framework'].includes(config.status));
  const byId = new Map(config.modules.map(module => [module.id, module]));
  assert.equal(byId.size, config.modules.length, 'Duplicate module ID');
  const repositories = new Set();
  const capabilities = new Set();
  for (const module of config.modules) {
    assert.match(module.id, /^[a-z][a-z0-9-]*$/);
    assert.match(module.repository, /^StuHelper\/stuhelper-[a-z0-9-]+$/);
    assert(!repositories.has(module.repository), `Duplicate repository owner: ${module.repository}`);
    repositories.add(module.repository);
    assert(['public', 'private'].includes(module.visibility));
    assert(['not-implemented', 'framework', 'library'].includes(module.implementation));
    assert.equal(module.interface_owner, module.id);
    assert(['design-only', 'framework', 'library'].includes(module.contract_status));
    if (module.implementation === 'library') {
      assert.equal(module.contract_status, 'library');
      assert(!module.capabilities?.length, 'Libraries do not expose runtime capabilities');
    }
    if (module.implementation === 'framework') {
      assert.equal(module.contract_status, 'framework');
      assert(Number.isInteger(module.api) && module.api > 0);
      assert(Array.isArray(module.capabilities));
      assert(module.capability_requires && typeof module.capability_requires === 'object');
    }
    const declared = new Set();
    for (const kind of ['required', 'optional']) {
      assert(Array.isArray(module[kind]), `${module.id}: ${kind} must be a list`);
      for (const dependency of module[kind]) {
        assert(byId.has(dependency), `Unknown dependency: ${module.id}/${dependency}`);
        assert.notEqual(dependency, module.id, 'Self dependency');
        assert(!declared.has(dependency), `Repeated dependency: ${module.id}/${dependency}`);
        declared.add(dependency);
      }
    }
    for (const provider of Object.values(module.eligibility_facts ?? {})) {
      assert(declared.has(provider), `Undeclared eligibility provider: ${module.id}/${provider}`);
    }
    for (const capability of module.capabilities ?? []) {
      assert.match(capability, /^[a-z][a-z0-9-]*\.[a-z][a-z0-9.-]*$/);
      assert(!capabilities.has(capability), `Duplicate capability: ${capability}`);
      capabilities.add(capability);
    }
    for (const [capability, dependencies] of Object.entries(module.capability_requires ?? {})) {
      assert(module.capabilities.includes(capability), `Undeclared capability: ${capability}`);
      assert.equal(new Set(dependencies).size, dependencies.length);
      assert(dependencies.every(dependency => declared.has(dependency)), `Undeclared capability dependency: ${capability}`);
    }
  }
  for (const id of ['identity', 'verification', 'campus-adapters', 'storage-bhpan', 'billing']) {
    assert.equal(byId.get(id)?.visibility, 'private', `${id} must remain private`);
  }
  const apps = new Map(config.applications.map(app => [app.id, app]));
  assert.equal(apps.size, config.applications.length, 'Duplicate application ID');
  for (const app of apps.values()) {
    assert.equal(app.repository, `StuHelper/stuhelper-${app.id}`);
    assert.equal(app.visibility, app.id === 'backend' ? 'private' : 'public');
  }
  for (const module of config.modules.filter(item => item.in_application)) {
    assert.equal(module.repository, apps.get(module.in_application)?.repository, 'Application module ownership mismatch');
  }
  const visited = new Set();
  const active = new Set();
  function visit(id) {
    assert(!active.has(id), `Required dependency cycle: ${[...active, id].join(' -> ')}`);
    if (visited.has(id)) return;
    active.add(id);
    for (const dependency of byId.get(id).required) visit(dependency);
    active.delete(id);
    visited.add(id);
  }
  for (const id of byId.keys()) visit(id);
}

export function validateSpecifications(config, directory = root) {
  const references = new Set(config.shared_specifications ?? []);
  for (const item of [...config.modules, ...config.applications, ...config.operations]) {
    assert(item.specifications?.length, `Missing specifications: ${item.id}`);
    for (const reference of item.specifications) references.add(reference);
  }
  for (const reference of references) {
    assert(/^docs\/spec\/[^/]+\.md$/.test(reference) && fs.statSync(path.join(directory, reference)).isFile(), `Invalid specification: ${reference}`);
  }
  for (const file of fs.readdirSync(path.join(directory, 'docs/spec')).filter(file => file.endsWith('.md') && !['README.md', 'TEMPLATE.md'].includes(file))) {
    assert(references.has(`docs/spec/${file}`), `Specification has no owner: ${file}`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const config = readYaml(path.join(root, 'architecture/modules.yaml'));
    validateModules(config);
    validateSpecifications(config);
    console.log(`PASS: ${config.modules.length} modules, dependencies and specification ownership`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
