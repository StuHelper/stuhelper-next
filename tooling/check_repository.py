"""Shared checks for tracked source paths and syntax."""
import ast
import json
import subprocess
import sys
from pathlib import Path

def private_material_errors(path):
    name, suffix = (path.name.lower(), path.suffix.lower())
    errors = []
    if (name.startswith('.env') or suffix == '.env') and (not name.endswith('.example')):
        errors.append(f'Runtime environment file: {path}')
    if suffix in {'.pem', '.key', '.p12', '.pfx', '.dump', '.backup'}:
        errors.append(f'Private material extension: {path}')
    return errors

def main(root):
    files = [root / p for p in subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '-z'], cwd=root).decode().split('\x00') if p]
    failures = []
    for path in files:
        if not path.exists():
            continue
        relative = path.relative_to(root)
        failures.extend(private_material_errors(relative))
        if path.suffix == '.py':
            ast.parse(path.read_text(), filename=str(relative))
        if path.suffix == '.json':
            json.loads(path.read_text())
    if failures:
        raise SystemExit('\n'.join(failures))
    print(f'PASS: {len(files)} files; Python/JSON syntax and private-material checks')
if __name__ == '__main__':
    try:
        main(Path.cwd())
    except (ValueError, OSError, SyntaxError) as error:
        raise SystemExit(str(error)) from None
