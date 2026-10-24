"""Prevent invalid module ownership, privacy and dependency declarations."""

import json
import os
import subprocess
import sys
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
        with self.assertRaisesRegex(ValueError, "Private module exposed"):
            validate_modules(self.config)

    def test_modules_cannot_silently_share_repository_ownership(self):
        self.modules["reviews"]["repository"] = self.modules["catalog"]["repository"]
        with self.assertRaisesRegex(ValueError, "Duplicate repository owner"):
            validate_modules(self.config)

    def test_required_dependency_cycle_fails(self):
        self.modules["platform"]["required"] = ["reviews"]
        with self.assertRaisesRegex(ValueError, "Required dependency cycle"):
            validate_modules(self.config)

    def test_unknown_optional_provider_is_not_accepted(self):
        self.modules["resources"]["optional"].append("missing-provider")
        with self.assertRaisesRegex(ValueError, "Unknown dependency"):
            validate_modules(self.config)

    def test_optimized_python_still_rejects_invalid_visibility(self):
        root = Path(__file__).resolve().parents[1]
        code = "import json; from scripts.check import validate_modules; config=json.load(open('architecture/modules.json')); next(m for m in config['modules'] if m['id']=='identity')['visibility']='public'; validate_modules(config)"
        for args, optimized in [(['-O'], '0'), ([], '1')]:
            result = subprocess.run([sys.executable, *args, '-c', code], cwd=root, env={**os.environ, 'PYTHONOPTIMIZE': optimized}, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Private module exposed', result.stderr)

    def test_every_module_has_valid_specification_references(self):
        validate_specifications(self.config)
        self.modules['media']['specifications'] = []
        with self.assertRaisesRegex(ValueError, 'Missing specification'):
            validate_specifications(self.config)

    def test_declared_architecture_passes(self):
        self.assertEqual(len(validate_modules(self.config)), len(self.modules))


if __name__ == "__main__":
    unittest.main()
