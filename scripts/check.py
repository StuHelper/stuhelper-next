#!/usr/bin/env python3
"""Offline checks for the architecture repository, not business acceptance."""

import ast
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def main():
    files = [ROOT / p for p in subprocess.check_output(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard", "-z"],
        cwd=ROOT,
    ).decode().split("\0") if p]
    failures = []
    for path in files:
        relative = path.relative_to(ROOT)
        if path.name.startswith(".env") and path.name != ".env.example":
            failures.append(f"Runtime environment file: {relative}")
        if path.suffix in {".pem", ".key", ".p12", ".pfx", ".dump", ".backup"}:
            failures.append(f"Private material extension: {relative}")
        if path.suffix == ".py":
            ast.parse(path.read_text(), filename=str(relative))
        if path.suffix == ".json":
            json.loads(path.read_text())

    config = json.loads((ROOT / "architecture/modules.json").read_text())
    assert config["schema_version"] == 1 and config["status"] == "design-only"
    modules = config["modules"]
    by_id = {module["id"]: module for module in modules}
    assert len(by_id) == len(modules), "Duplicate module ID"
    for module in modules:
        assert re.fullmatch(r"[a-z][a-z0-9-]*", module["id"])
        for kind in ("required", "optional"):
            deps = module[kind]
            assert len(deps) == len(set(deps)), "Duplicate dependency"
            assert set(deps) <= by_id.keys(), "Unknown dependency"
            assert module["id"] not in deps, "Self dependency"
        assert not set(module["required"]) & set(module["optional"])
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

    lock = json.loads((ROOT / "ops/sso/candidate.json").read_text())
    assert lock["status"] == "candidate-not-deployed"
    assert re.fullmatch(r"v4\.\d+\.\d+", lock["version"])
    assert re.fullmatch(r"[0-9a-f]{40}", lock["commit"])
    assert re.fullmatch(r"docker.io/casbin/casdoor@sha256:[0-9a-f]{64}", lock["image"])
    assert lock["repository"] == "https://github.com/casdoor/casdoor"
    assert lock["release_url"] == lock["repository"] + "/releases/tag/" + lock["version"]
    assert lock["platforms"], "No supported platform in candidate"
    for platform in lock["platforms"]:
        assert re.fullmatch(r"sha256:[0-9a-f]{64}", platform["digest"])
        assert platform["platform"].startswith("linux/")

    if failures:
        raise SystemExit("\n".join(failures))
    print(f"PASS: {len(files)} files; Python/JSON syntax, "
          f"{len(modules)} module declarations, candidate metadata")
    print("Scope: repository checks only; no application, SSO migration or login acceptance.")


if __name__ == "__main__":
    main()
