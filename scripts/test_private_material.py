import unittest
from pathlib import Path
from check import private_material_errors


class PrivateMaterialTests(unittest.TestCase):
    def test_prohibited_files_are_case_insensitive(self):
        for name in (".ENV", ".env.production", "production.env", "STAGING.ENV", "credentials.PEM", "client.P12", "student-data.DUMP", "db.BACKUP"):
            with self.subTest(name=name):
                self.assertTrue(private_material_errors(Path(name)))

    def test_explicit_environment_examples_and_source_are_allowed(self):
        for name in (".env.example", "production.env.example", "script.py", "metadata.json"):
            with self.subTest(name=name):
                self.assertEqual(private_material_errors(Path(name)), [])


if __name__ == "__main__":
    unittest.main()
