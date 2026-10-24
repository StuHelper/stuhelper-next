"""Prevent invalid module ownership, privacy and dependency declarations."""

import json
import os
import subprocess
import sys
import tempfile
import shutil
import unittest
from pathlib import Path

from check import validate_modules, validate_specifications


class ModuleManifestTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((Path(__file__).resolve().parents[1]
                                  / "architecture/modules.json").read_text())
        self.modules = {m["id"]: m for m in self.config["modules"]}

    def test_private_module_cannot_be_public(self):
        self.modules["verification"]["visibility"] = "public"
        with self.assertRaisesRegex(ValueError, "仓库可见性必须为 private"):
            validate_modules(self.config)

    def test_modules_cannot_silently_share_repository_ownership(self):
        self.modules["reviews"]["repository"] = self.modules["catalog"]["repository"]
        with self.assertRaisesRegex(ValueError, "重复使用仓库"):
            validate_modules(self.config)

    def test_required_dependency_cycle_fails(self):
        self.modules["platform"]["required"] = ["reviews"]
        with self.assertRaisesRegex(ValueError, "必需依赖存在环"):
            validate_modules(self.config)

    def test_unknown_optional_provider_is_not_accepted(self):
        self.modules["resources"]["optional"].append("missing-provider")
        with self.assertRaisesRegex(ValueError, "未声明的 optional 依赖"):
            validate_modules(self.config)

    def test_optimized_python_still_rejects_invalid_visibility(self):
        root = Path(__file__).resolve().parents[1]
        code = "import json; from scripts.check import validate_modules; config=json.load(open('architecture/modules.json')); next(m for m in config['modules'] if m['id']=='identity')['visibility']='public'; validate_modules(config)"
        for args, optimized in [(['-O'], '0'), ([], '1')]:
            result = subprocess.run([sys.executable, *args, '-c', code], cwd=root, env={**os.environ, 'PYTHONOPTIMIZE': optimized}, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('仓库可见性必须为 private', result.stderr)

    def test_every_module_has_valid_specification_references(self):
        validate_specifications(self.config)
        self.modules['media']['specifications'] = []
        with self.assertRaisesRegex(ValueError, '缺少规格文档引用'):
            validate_specifications(self.config)

    def test_implemented_capability_and_fact_dependencies_match_declared_services(self):
        self.modules['platform']['capability_requires']['platform.status'] = ['identity']
        with self.assertRaisesRegex(ValueError, '依赖必须来自模块'):
            validate_modules(self.config)
        self.modules['platform']['capability_requires'] = {}
        self.modules['reviews']['eligibility_facts']['phone_bound'] = 'missing'
        with self.assertRaisesRegex(ValueError, '资格事实.*未声明的服务'):
            validate_modules(self.config)

    def test_cli_validation_failure_is_readable_without_traceback(self):
        root = Path(__file__).resolve().parents[1]
        with tempfile.TemporaryDirectory() as temporary:
            target = Path(temporary)
            (target / 'scripts').mkdir()
            (target / 'architecture').mkdir()
            shutil.copy(root / 'scripts/check.py', target / 'scripts/check.py')
            self.modules['platform']['visibility'] = 'unknown'
            (target / 'architecture/modules.json').write_text(json.dumps(self.config))
            result = subprocess.run([sys.executable, '-O', str(target / 'scripts/check.py')], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('模块 platform 的可见性必须是 public 或 private', result.stderr)
            self.assertNotIn('Traceback', result.stderr)

    def test_declared_architecture_passes(self):
        self.assertEqual(len(validate_modules(self.config)), len(self.modules))


if __name__ == "__main__":
    unittest.main()
