#!/usr/bin/env python3
"""Validate module ownership, dependencies and specification coverage."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate_modules(config):
    if config['schema_version'] != 2:
        raise ValueError('模块清单的 schema_version 必须为 2。')
    if config['status'] not in {'design-only', 'framework-in-progress', 'framework'}:
        raise ValueError(f"模块清单的状态无效：{config['status']}。")
    if config['repository_model'] != 'modular-multi-repo':
        raise ValueError('仓库模式必须为 modular-multi-repo。')
    modules = config['modules']
    if not isinstance(modules, list) or any(not isinstance(module, dict) for module in modules):
        raise ValueError('modules 必须是模块对象组成的列表。')
    by_id = {module['id']: module for module in modules}
    if len(by_id) != len(modules):
        raise ValueError('模块 ID 重复，每个模块需要唯一标识。')
    owners = {}
    capabilities = {}
    for module in modules:
        name = module['id']
        if not re.fullmatch(r'[a-z][a-z0-9-]*', name):
            raise ValueError(f'模块 ID {name!r} 必须以小写字母开头，只含小写字母、数字和连字符。')
        repository = module['repository']
        if not re.fullmatch(r'StuHelper/stuhelper-[a-z0-9-]+', repository):
            raise ValueError(f'模块 {name} 的仓库名 {repository!r} 必须符合 StuHelper/stuhelper-名称 格式。')
        if repository in owners:
            raise ValueError(f'模块 {name} 与 {owners[repository]} 重复使用仓库 {repository}。')
        owners[repository] = name
        if module['visibility'] not in {'public', 'private'}:
            raise ValueError(f"模块 {name} 的可见性必须是 public 或 private，实际为 {module['visibility']!r}。")
        if module['implementation'] not in {'not-implemented', 'framework'}:
            raise ValueError(f"模块 {name} 的实现状态无效：{module['implementation']!r}。")
        if module['interface_owner'] != name:
            raise ValueError(f'模块 {name} 必须维护自己的接口。')
        if module['contract_status'] not in {'design-only', 'framework'}:
            raise ValueError(f"模块 {name} 的接口状态无效：{module['contract_status']!r}。")
        if module['implementation'] == 'framework':
            if name != 'platform' or module['contract_status'] != 'framework':
                raise ValueError(f'当前框架阶段只接受 platform 的已实现声明，模块 {name} 需要对应的业务实施验收。')
            if type(module.get('api')) is not int or module['api'] < 1:
                raise ValueError(f'已实现模块 {name} 需要正整数接口主版本 api。')
            if not isinstance(module.get('capabilities'), list) or not isinstance(module.get('capability_requires'), dict):
                raise ValueError(f'已实现模块 {name} 需要 capabilities 和 capability_requires 声明。')
        for kind in ('required', 'optional'):
            dependencies = module[kind]
            if len(dependencies) != len(set(dependencies)):
                raise ValueError(f'模块 {name} 的 {kind} 依赖存在重复项。')
            unknown = set(dependencies) - by_id.keys()
            if unknown:
                raise ValueError(f'模块 {name} 引用了未声明的 {kind} 依赖：{", ".join(sorted(unknown))}。')
            if name in dependencies:
                raise ValueError(f'模块 {name} 不能依赖自身。')
        overlap = set(module['required']) & set(module['optional'])
        if overlap:
            raise ValueError(f'模块 {name} 同时将 {", ".join(sorted(overlap))} 声明为必需和可选依赖。')
        for fact, provider in module.get('eligibility_facts', {}).items():
            if provider not in set(module['required']) | set(module['optional']):
                raise ValueError(f'模块 {name} 的资格事实 {fact} 使用了未声明的服务 {provider}。')
        for capability in module.get('capabilities', []):
            if capability in capabilities:
                raise ValueError(f'能力 {capability} 同时属于 {name} 和 {capabilities[capability]}。')
            if not re.fullmatch(r'[a-z][a-z0-9-]*\.[a-z][a-z0-9.-]*', capability):
                raise ValueError(f'模块 {name} 的能力名称无效：{capability!r}。')
            capabilities[capability] = name
        for capability, dependencies in module.get('capability_requires', {}).items():
            if capability not in module.get('capabilities', []):
                raise ValueError(f'模块 {name} 为未声明的能力 {capability} 配置了依赖。')
            declared = set(module['required']) | set(module['optional'])
            if len(dependencies) != len(set(dependencies)) or set(dependencies) - declared:
                raise ValueError(f'能力 {capability} 的依赖必须来自模块 {name} 的依赖声明且保持唯一。')
    for name in ('identity', 'verification', 'campus-adapters', 'billing'):
        if by_id[name]['visibility'] != 'private':
            raise ValueError(f'模块 {name} 包含私有实现，仓库可见性必须为 private。')
    applications = config.get('applications', [])
    if len({app['id'] for app in applications}) != len(applications):
        raise ValueError('应用 ID 重复，每个应用需要唯一标识。')
    for app in applications:
        name = app['id']
        if name not in {'web', 'admin'}:
            raise ValueError(f'应用 {name} 尚未纳入当前实施范围。')
        if app['repository'] != f'StuHelper/stuhelper-{name}':
            raise ValueError(f'应用 {name} 的仓库必须为 StuHelper/stuhelper-{name}。')
        if app['visibility'] != 'public' or app['implementation'] != 'framework':
            raise ValueError(f'应用 {name} 应声明为公开的框架实现。')
    visited, active = set(), []

    def visit(name):
        if name in active:
            raise ValueError(f'必需依赖存在环：{" → ".join([*active, name])}。')
        if name in visited:
            return
        active.append(name)
        for dependency in by_id[name]['required']:
            visit(dependency)
        active.pop()
        visited.add(name)
    for name in by_id:
        visit(name)
    return modules


def validate_specifications(config, root=ROOT):
    references = set(config.get('shared_specifications', []))
    for item in [*config['modules'], *config.get('applications', []), *config.get('operations', [])]:
        specs = item.get('specifications', [])
        if not specs:
            raise ValueError(f"模块或应用 {item['id']} 缺少规格文档引用。")
        references.update(specs)
    for reference in references:
        target = root / reference
        if not reference.startswith('docs/spec/') or '..' in Path(reference).parts or not target.is_file():
            raise ValueError(f'规格文档 {reference} 不存在或位于 docs/spec/ 之外。')
    actual = {str(file.relative_to(root)) for file in (root / 'docs/spec').glob('*.md') if file.name not in {'README.md', 'TEMPLATE.md'}}
    if actual - references:
        raise ValueError(f'以下规格文档缺少所属模块：{", ".join(sorted(actual - references))}。')


def main():
    config = json.loads((ROOT / 'architecture/modules.json').read_text())
    modules = validate_modules(config)
    validate_specifications(config)
    print(f'PASS: {len(modules)} module declarations, ownership, dependency graph and specifications')


if __name__ == '__main__':
    try:
        main()
    except KeyError as error:
        raise SystemExit(f'模块清单缺少字段：{error.args[0]}。') from None
    except TypeError:
        raise SystemExit('模块清单的字段类型不正确，请检查模块对象和依赖列表。') from None
    except (ValueError, OSError) as error:
        raise SystemExit(str(error)) from None
