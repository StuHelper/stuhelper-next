---
type: guide
status: Accepted
updated: 2026-10-25
---

# 仓库检查与文档预览

## 检查入口

先运行 `make setup` 安装 pnpm 锁文件中的依赖，再运行 `make check`。架构仓库检查自己的模块清单、规格归属、工具链、Markdown、导航和工作流。独立仓库各自执行测试与构建。

共享检查来自 [stuhelper-tooling](https://github.com/StuHelper/stuhelper-tooling)，通过明确版本 tag 安装。Go 正式检查使用 `GOWORK=off`。actionlint 由共享 setup action 安装并校验官方 checksum；本地使用相同版本，版本见工具链清单。

```bash
make setup
make check
mani run check --tags code
node scripts/workspace.mjs toolchains
node scripts/workspace.mjs contracts
```

Mani 原生批量输出用于本地开发。CI 在各仓工作目录直接运行检查命令，以命令的非零退出码判断失败，不依赖 Mani 的批量汇总退出码。

## 本地 hooks

每个仓库运行 `pnpm exec lefthook install`。旧克隆若设置了 `core.hooksPath=.githooks`，先核对该值并执行 `git config --local --unset core.hooksPath`，再安装 Lefthook。其他自定义 hook 路径按其用途处理。

pre-commit 检查暂存区快照，包括文件安全、脚本权限、语法和文档；前端增加暂存文件 ESLint。检查使用本地依赖，不联网安装、不修改工作树，也不重新暂存文件。部分暂存、关联 worktree、首次提交、失败和中断清理由工具仓库测试覆盖。

当前不配置 pre-push。完整检查由显式命令和 CI 执行。修改依赖后先安装新锁文件，再提交。CI 设置 `LEFTHOOK=0`，直接运行检查入口。

## 工作区与应用测试

`scripts/architecture.mjs` 验证模块、依赖和规格；`scripts/workspace.mjs` 处理 Mani 约定、工具链、Go Workspace、契约来源与联调快照。通用检查器及其回归测试在工具仓库维护。

应用联调使用 platform 公开示例、Web 和 Admin。先构建三者，运行 `node scripts/workspace.mjs contracts`，再运行 `pnpm run test:e2e`。浏览器覆盖八种语言与桌面、移动视口，不包含文档站。

## 文档预览

本地安装 uv 后运行 `make docs`，命令使用 `uvx --with mkdocs-material --with mkdocs-mermaid-zoom mkdocs serve`。MkDocs 配置只服务开发预览，文档没有独立 uv 项目或锁文件。

CI 保留 Markdown、元信息、链接和导航检查，不安装 MkDocs、不构建或部署文档站。专业 Python 工具可使用自己的标准库或明确依赖，不因此为文档引入 Python 工作区。
