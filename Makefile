.PHONY: setup check

setup:
	pnpm install --frozen-lockfile
	uv sync --locked

check:
	node tooling/cli.mjs repository
	python3 scripts/check.py
	python3 -m unittest discover -s scripts -p 'test_*.py'
	node scripts/workspace.mjs validate
	node --test scripts/workspace.test.mjs
	pnpm run check:docs
	pnpm run test:tools
	uv run --locked mkdocs build --strict
	node tooling/cli.mjs workflows
