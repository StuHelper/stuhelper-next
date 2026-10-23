"""Prevent invalid module ownership, privacy and dependency declarations."""

import json
import unittest
from pathlib import Path

from check import validate_modules


class ModuleManifestTests(unittest.TestCase):
    def setUp(self):
        self.config = json.loads((Path(__file__).resolve().parents[1]
                                  / "architecture/modules.json").read_text())
        self.modules = {m["id"]: m for m in self.config["modules"]}

    def test_private_module_cannot_be_public(self):
        self.modules["verification"]["visibility"] = "public"
        with self.assertRaisesRegex(AssertionError, "Private module exposed"):
            validate_modules(self.config)

    def test_modules_cannot_silently_share_repository_ownership(self):
        self.modules["reviews"]["repository"] = self.modules["catalog"]["repository"]
        with self.assertRaisesRegex(AssertionError, "Duplicate repository owner"):
            validate_modules(self.config)

    def test_required_dependency_cycle_fails(self):
        self.modules["platform"]["required"] = ["reviews"]
        with self.assertRaisesRegex(AssertionError, "Required dependency cycle"):
            validate_modules(self.config)

    def test_unknown_optional_provider_is_not_accepted(self):
        self.modules["resources"]["optional"].append("missing-provider")
        with self.assertRaisesRegex(AssertionError, "Unknown dependency"):
            validate_modules(self.config)

    def test_declared_architecture_passes(self):
        self.assertEqual(len(validate_modules(self.config)), len(self.modules))


if __name__ == "__main__":
    unittest.main()
