.PHONY: setup check

setup:
	npm ci --ignore-scripts
	uv sync --locked

check:
	python3 scripts/check.py
	python3 -m unittest discover -s scripts -p 'test_*.py'
	node scripts/workspace.mjs validate
	node --test scripts/workspace.test.mjs
	npm run check:docs
	npm run test:docs
	uv run --locked mkdocs build --strict
	python3 scripts/lint_workflows.py
