.PHONY: tools setup check workspace workspace-private workspace-check contracts-check

tools:
	GOBIN="$(CURDIR)/.tools/bin" GOWORK=off go install github.com/alajmo/mani@v0.32.1

setup:
	npm ci --ignore-scripts
	uv sync --locked

check:
	python3 scripts/check.py
	python3 -m unittest discover -s scripts -p 'test_*.py'
	npm run check:docs
	node scripts/check-workspace.mjs
	npm run test:docs
	uv run --locked mkdocs build --strict
	python3 scripts/lint_workflows.py

workspace:
	.tools/bin/mani --user-config scripts/mani-user.yaml sync

workspace-private:
	.tools/bin/mani --user-config scripts/mani-user.yaml --config mani.private.yaml sync

workspace-check:
	.tools/bin/mani --user-config scripts/mani-user.yaml run check --all
	python3 scripts/workspace.py verify

contracts-check:
	python3 scripts/workspace.py contracts
