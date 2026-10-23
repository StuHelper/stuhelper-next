#!/usr/bin/env python3
"""Check a development workspace without switching branches or modifying Git data."""

import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PROJECTS = {"platform": "workspace/platform", "web": "workspace/web", "admin": "workspace/admin"}


def git(path, *args):
    return subprocess.check_output(["git", "-C", str(path), *args], text=True, stderr=subprocess.PIPE).strip()


def inspect(root=ROOT):
    result = []
    for name, location in PROJECTS.items():
        path = root / location
        if not path.is_dir():
            raise ValueError(f"Missing workspace project: {name}; run make workspace")
        actual_root = Path(git(path, "rev-parse", "--show-toplevel")).resolve()
        if actual_root != path.resolve():
            raise ValueError(f"Not an independent repository checkout: {name}")
        remote = git(path, "remote", "get-url", "origin")
        expected = f"StuHelper/stuhelper-{name}"
        if remote not in (f"https://github.com/{expected}.git", f"git@github.com:{expected}.git"):
            raise ValueError(f"Unexpected origin for {name}")
        result.append({"name": name, "repository": expected, "commit": git(path, "rev-parse", "HEAD"), "dirty": bool(git(path, "status", "--porcelain"))})
    return result


def check_contracts(root=ROOT):
    provider = root / PROJECTS["platform"]
    checks = [("contracts/platform.openapi.yaml", "contracts/platform.openapi.yaml", "contracts/platform.openapi.yaml"), ("sdk/platform.gen.ts", "src/api/platform.gen.ts", "apps/web-antd/src/api/platform.gen.ts")]
    for provider_path, web_path, admin_path in checks:
        source = (provider / provider_path).read_bytes()
        for name, target in (("web", web_path), ("admin", admin_path)):
            if source != (root / PROJECTS[name] / target).read_bytes():
                raise ValueError(f"Platform contract snapshot drift in {name}: {target}")
    return hashlib.sha256((provider / checks[0][0]).read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["verify", "contracts", "snapshot"])
    args = parser.parse_args()
    if args.command == "contracts":
        print(f"PASS: provider and both client contract snapshots match ({check_contracts()})")
        return
    repositories = inspect()
    checksum = check_contracts()
    if args.command == "snapshot":
        if any(project["dirty"] for project in repositories):
            raise ValueError("A verified source snapshot requires clean worktrees")
        print(json.dumps({"purpose": "source-verification-record", "repositories": repositories, "contract_sha256": checksum}, indent=2))
    else:
        print(f"PASS: {len(repositories)} independent public repositories and matching client contracts")


if __name__ == "__main__":
    main()
