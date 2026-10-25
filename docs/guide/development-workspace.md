---
type: guide
status: Accepted
updated: 2026-10-25
---

# 开发工作区

## 初始化

主机安装 Git 与 Mani，项目 Node.js、pnpm 和 Go 版本见 `architecture/toolchains.yaml`。在主仓库运行 `make setup`、`mani sync`，再按需要运行 `mani run setup --tags code`。私有仓库使用开发者已有的 GitHub 授权。

主检出位于 `workspace/<仓库名>`，任务工作树位于 `workspace/worktrees/<任务>/<仓库名>`。Mani 登记九个仓库，包括公共工具库和私有 backend；尚无源码的业务模块不预建空仓库。

## 日常操作

```bash
mani run status --all
mani run fetch --all
mani run setup --tags code
mani run check --tags code
mani run hooks --all
```

每次开发先刷新目标仓库的 `origin/develop`。大功能通过原生 `git worktree add -b <分支> <路径> origin/develop` 建立隔离工作树，一个主要写入者。保留其他工作树的未提交内容。

同一任务持续更新同一 PR，短期分支 squash 合入 develop。正式发布使用 develop 到 main 的 merge commit；发行 tag、镜像和环境晋级按对应授权执行。

## 联合开发与正式依赖

运行 `node scripts/workspace.mjs go-work`，在本地生成含已检出 Go module 的 `go.work`。候选测试显式设置 `GOWORK=<工作区绝对路径>/go.work`。这个文件不提交。

正式 backend 构建设置 `GOWORK=off`，依赖来自自己的 `go.mod` 和 `go.sum`。platform 保留 `examples/server`，公开 CI 无需 backend 或私有业务源码。

## 联调记录

`node scripts/workspace.mjs snapshot` 显示已检出仓库的实际提交和脏状态。`snapshot --write` 要求这些检出已提交，生成 `workspace.lock.json`。该工具生成记录用于复查，不要求日常每次提交都更新。

跨仓 PR 在描述中列出依赖 PR、测试提交和合并顺序。应用集成工作流默认使用公开仓库 develop；手动候选输入使用完整提交 SHA。每轮把实际提交写入 CI summary，候选更新后重新执行。

人工维护的联调候选使用 YAML，快照保留工具生成的 JSON。Mani 清单管理开发目录，ops 的 Compose 发布覆盖文件管理部署组合，两个用途分别维护。
