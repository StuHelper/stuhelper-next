#!/usr/bin/env python3
"""Offline checks for the architecture repository, not business acceptance."""

import ast
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def validate_modules(config):
    assert config["schema_version"] == 2 and config["status"] == "design-only"
    assert config["repository_model"] == "modular-multi-repo"
    modules = config["modules"]
    by_id = {module["id"]: module for module in modules}
    assert len(by_id) == len(modules), "Duplicate module ID"
    for module in modules:
        assert re.fullmatch(r"[a-z][a-z0-9-]*", module["id"])
        assert re.fullmatch(r"StuHelper/stuhelper-[a-z0-9-]+", module["repository"])
        assert module["visibility"] in {"public", "private"}
        assert module["implementation"] == "not-implemented"
        assert module["interface_owner"] == module["id"]
        assert module["contract_status"] == "design-only"
        for kind in ("required", "optional"):
            deps = module[kind]
            assert len(deps) == len(set(deps)), "Duplicate dependency"
            assert set(deps) <= by_id.keys(), "Unknown dependency"
            assert module["id"] not in deps, "Self dependency"
        assert not set(module["required"]) & set(module["optional"])
    assert len({module["repository"] for module in modules}) == len(modules), "Duplicate repository owner"
    for private_id in ("identity", "verification", "campus-adapters", "billing"):
        assert by_id[private_id]["visibility"] == "private", "Private module exposed"
    visited, active = set(), set()

    def visit(name):
        assert name not in active, f"Required dependency cycle at {name}"
        if name in visited:
            return
        active.add(name)
        for dependency in by_id[name]["required"]:
            visit(dependency)
        active.remove(name)
        visited.add(name)

    for name in by_id:
        visit(name)

    return modules


def private_material_errors(path):
    name, suffix = path.name.lower(), path.suffix.lower()
    errors = []
    if (name.startswith(".env") or suffix == ".env") and not name.endswith(".example"):
        errors.append(f"Runtime environment file: {path}")
    if suffix in {".pem", ".key", ".p12", ".pfx", ".dump", ".backup"}:
        errors.append(f"Private material extension: {path}")
    return errors


def main():
    files = [ROOT / p for p in subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    ).decode().split("\0") if p]
    failures = []
    for path in files:
        relative = path.relative_to(ROOT)
        failures.extend(private_material_errors(relative))
        if not path.exists():
            continue  # A tracked file intentionally moved out of this checkout.
        if path.suffix == ".py":
            ast.parse(path.read_text(), filename=str(relative))
        if path.suffix == ".json":
            json.loads(path.read_text())

    config = json.loads((ROOT / "architecture/modules.json").read_text())
    modules = validate_modules(config)

    if failures:
        raise SystemExit("\n".join(failures))
    print(f"PASS: {len(files)} files; Python/JSON syntax, "
          f"{len(modules)} module repositories, visibility and dependency declarations")
    print("Scope: repository checks only; no application, SSO migration or login acceptance.")


if __name__ == "__main__":
    main()
