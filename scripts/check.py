#!/usr/bin/env python3
"""Offline checks for the architecture repository, not business acceptance."""
import ast
import json
import re
import subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]

def validate_modules(config):
    if not config['schema_version'] == 2:
        raise ValueError("Invalid repository declaration: config['schema_version'] == 2")
    if not config['status'] in {'design-only', 'framework-in-progress', 'framework'}:
        raise ValueError("Invalid repository declaration: config['status'] in {'design-only', 'framework-in-progress', 'framework'}")
    if not config['repository_model'] == 'modular-multi-repo':
        raise ValueError("Invalid repository declaration: config['repository_model'] == 'modular-multi-repo'")
    modules = config['modules']
    by_id = {module['id']: module for module in modules}
    if not len(by_id) == len(modules):
        raise ValueError('Duplicate module ID')
    for module in modules:
        if not re.fullmatch('[a-z][a-z0-9-]*', module['id']):
            raise ValueError("Invalid repository declaration: re.fullmatch('[a-z][a-z0-9-]*', module['id'])")
        if not re.fullmatch('StuHelper/stuhelper-[a-z0-9-]+', module['repository']):
            raise ValueError("Invalid repository declaration: re.fullmatch('StuHelper/stuhelper-[a-z0-9-]+', module['repository'])")
        if not module['visibility'] in {'public', 'private'}:
            raise ValueError("Invalid repository declaration: module['visibility'] in {'public', 'private'}")
        if not module['implementation'] in {'not-implemented', 'framework'}:
            raise ValueError("Invalid repository declaration: module['implementation'] in {'not-implemented', 'framework'}")
        if not module['interface_owner'] == module['id']:
            raise ValueError("Invalid repository declaration: module['interface_owner'] == module['id']")
        if not module['contract_status'] in {'design-only', 'framework'}:
            raise ValueError("Invalid repository declaration: module['contract_status'] in {'design-only', 'framework'}")
        if module['implementation'] == 'framework':
            if not module['id'] == 'platform':
                raise ValueError('Business implementation is out of scope')
            if not module['contract_status'] == 'framework':
                raise ValueError("Invalid repository declaration: module['contract_status'] == 'framework'")
        for kind in ('required', 'optional'):
            deps = module[kind]
            if not len(deps) == len(set(deps)):
                raise ValueError('Duplicate dependency')
            if not set(deps) <= by_id.keys():
                raise ValueError('Unknown dependency')
            if not module['id'] not in deps:
                raise ValueError('Self dependency')
        if not not set(module['required']) & set(module['optional']):
            raise ValueError("Invalid repository declaration: not set(module['required']) & set(module['optional'])")
    if not len({module['repository'] for module in modules}) == len(modules):
        raise ValueError('Duplicate repository owner')
    for private_id in ('identity', 'verification', 'campus-adapters', 'billing'):
        if not by_id[private_id]['visibility'] == 'private':
            raise ValueError('Private module exposed')
    applications = config.get('applications', [])
    if not len({app['id'] for app in applications}) == len(applications):
        raise ValueError('Duplicate application')
    for app in applications:
        if not app['id'] in {'web', 'admin'}:
            raise ValueError('Deferred application introduced')
        if not app['repository'] == f"StuHelper/stuhelper-{app['id']}":
            raise ValueError('Invalid repository declaration: app[\'repository\'] == f"StuHelper/stuhelper-{app[\'id\']}"')
        if not (app['visibility'] == 'public' and app['implementation'] == 'framework'):
            raise ValueError("Invalid repository declaration: app['visibility'] == 'public' and app['implementation'] == 'framework'")
    visited, active = (set(), set())

    def visit(name):
        if not name not in active:
            raise ValueError(f'Required dependency cycle at {name}')
        if name in visited:
            return
        active.add(name)
        for dependency in by_id[name]['required']:
            visit(dependency)
        active.remove(name)
        visited.add(name)
    for name in by_id:
        visit(name)
    return modules

def validate_specifications(config, root=ROOT):
    references = set(config.get('shared_specifications', []))
    for item in [*config['modules'], *config.get('applications', []), *config.get('operations', [])]:
        specs = item.get('specifications', [])
        if not specs:
            raise ValueError(f"Missing specification mapping: {item['id']}")
        references.update(specs)
    for reference in references:
        path = root / reference
        if not reference.startswith('docs/spec/') or '..' in Path(reference).parts or not path.is_file():
            raise ValueError(f"Invalid specification reference: {reference}")
    actual = {str(path.relative_to(root)) for path in (root / 'docs/spec').glob('*.md') if path.name not in {'README.md', 'TEMPLATE.md'}}
    if actual - references:
        raise ValueError(f"Unmapped specifications: {sorted(actual - references)}")


def private_material_errors(path):
    name, suffix = (path.name.lower(), path.suffix.lower())
    errors = []
    if (name.startswith('.env') or suffix == '.env') and (not name.endswith('.example')):
        errors.append(f'Runtime environment file: {path}')
    if suffix in {'.pem', '.key', '.p12', '.pfx', '.dump', '.backup'}:
        errors.append(f'Private material extension: {path}')
    return errors

def main():
    files = [ROOT / p for p in subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=ROOT).decode().split('\x00') if p]
    failures = []
    for path in files:
        relative = path.relative_to(ROOT)
        failures.extend(private_material_errors(relative))
        if not path.exists():
            continue
        if path.suffix == '.py':
            ast.parse(path.read_text(), filename=str(relative))
        if path.suffix == '.json':
            json.loads(path.read_text())
    config = json.loads((ROOT / 'architecture/modules.json').read_text())
    modules = validate_modules(config)
    validate_specifications(config)
    if failures:
        raise SystemExit('\n'.join(failures))
    print(f'PASS: {len(files)} files; Python/JSON syntax, {len(modules)} module repositories, visibility and dependency declarations')
    print('Scope: repository checks only; no application, SSO migration or login acceptance.')
if __name__ == '__main__':
    main()
