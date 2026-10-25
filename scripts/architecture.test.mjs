import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { readYaml, root, validateModules, validateSpecifications } from './architecture.mjs';

const load = () => readYaml(path.join(root, 'architecture/modules.yaml'));
test('declared architecture and all specification owners are valid', () => {
  validateModules(load());
  validateSpecifications(load());
});
for (const [name, mutate, message] of [
  ['adapter libraries do not claim runtime capabilities', modules => { modules.get('storage-bhpan').capabilities = ['campus-adapters.runtime']; }, /runtime capabilities/],
  ['private implementation cannot become public', modules => { modules.get('verification').visibility = 'public'; }, /must remain private/],
  ['storage protocol implementation remains private', modules => { modules.get('storage-bhpan').visibility = 'public'; }, /must remain private/],
  ['repositories have one module owner', modules => { modules.get('reviews').repository = modules.get('catalog').repository; }, /Duplicate repository/],
  ['required dependency cycle fails', modules => { modules.get('platform').required = ['reviews']; }, /cycle/],
  ['unknown optional provider fails', modules => { modules.get('resources').optional.push('missing'); }, /Unknown dependency/],
  ['undeclared eligibility facts fail', modules => { modules.get('reviews').eligibility_facts.phone_bound = 'missing'; }, /Undeclared eligibility/],
  ['capability dependencies must be declared', modules => { modules.get('platform').capability_requires['platform.status'] = ['identity']; }, /Undeclared capability dependency/],
  ['same dependency cannot be required and optional', modules => { modules.get('reviews').optional.push('platform'); }, /Repeated dependency/],
]) test(name, () => {
  const config = load();
  mutate(new Map(config.modules.map(module => [module.id, module])));
  assert.throws(() => validateModules(config), message);
});
