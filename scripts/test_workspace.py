"""Exercise repository identity and cross-repository contract drift checks."""

import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

from workspace import PROJECTS, check_contracts, inspect


class WorkspaceTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for name, location in PROJECTS.items():
            path = self.root / location
            path.mkdir(parents=True)
            self.git(path, "init", "-b", "develop")
            self.git(path, "remote", "add", "origin", f"https://github.com/StuHelper/stuhelper-{name}.git")
            targets = ["contracts/platform.openapi.yaml", {"platform": "sdk/platform.gen.ts", "web": "src/api/platform.gen.ts", "admin": "apps/web-antd/src/api/platform.gen.ts"}[name]]
            for target in targets:
                (path / target).parent.mkdir(parents=True, exist_ok=True)
                (path / target).write_text("synthetic contract\n")
            self.git(path, "add", ".")
            self.git(path, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.test", "commit", "-m", "fixture")

    def git(self, path, *args):
        subprocess.run(["git", "-C", str(path), *args], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    def test_independent_repositories_and_matching_snapshots(self):
        records = inspect(self.root)
        self.assertEqual(len(records), 3)
        self.assertTrue(all(not record["dirty"] for record in records))
        self.assertEqual(len(check_contracts(self.root)), 64)

    def test_nested_directory_cannot_pass_as_module_repository(self):
        shutil.rmtree(self.root / PROJECTS["web"] / ".git")
        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
            inspect(self.root)

    def test_unrelated_remote_rejected(self):
        self.git(self.root / PROJECTS["web"], "remote", "set-url", "origin", "https://example.test/unrelated.git")
        with self.assertRaisesRegex(ValueError, "Unexpected origin"):
            inspect(self.root)

    def test_generated_type_drift_rejected(self):
        target = self.root / PROJECTS["admin"] / "apps/web-antd/src/api/platform.gen.ts"
        target.write_text("manually changed\n")
        with self.assertRaisesRegex(ValueError, "snapshot drift"):
            check_contracts(self.root)

    def test_dirty_state_preserved_and_reported(self):
        target = self.root / PROJECTS["web"] / "local.txt"
        target.write_text("unfinished work\n")
        records = inspect(self.root)
        self.assertTrue(next(record for record in records if record["name"] == "web")["dirty"])
        self.assertEqual(target.read_text(), "unfinished work\n")


if __name__ == "__main__":
    unittest.main()
