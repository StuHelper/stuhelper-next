---
type: guide
status: Accepted
updated: 2026-10-24
---

# 开发工作区

## 准备

主机安装 Git、Mani、Go、Node.js、Corepack 和 uv。项目工具链版本以[版本清单](https://github.com/StuHelper/stuhelper-next/blob/develop/architecture/toolchains.json)为准。完整工作区需要访问清单中的八个仓库。

```bash
git clone --branch develop https://github.com/StuHelper/stuhelper-next.git
cd stuhelper-next
make setup
mani sync
mani run setup --tags code
node scripts/workspace.mjs go-work
```

`mani.yaml` 统一登记代码和文档仓库。GitHub 管理源码访问权限，业务系统管理运行时权限。Go Workspace 包含当前已检出的 Go 模块；各模块同时保留自己的独立构建入口。

## 日常操作

```bash
mani run status --all
mani run fetch --all
mani run check --tags code
node scripts/workspace.mjs toolchains
node scripts/workspace.mjs contracts
```

Mani 的 `sync` 克隆缺失仓库，`fetch` 更新远端引用。分支选择和合并由各仓库的 Git 操作完成。配置保留现有 remotes、工作树和 gitignore。

## 任务工作树

主检出位于 `workspace/<仓库名>`。同一任务的工作树放在 `workspace/worktrees/<任务>/<仓库名>`：

工作树目标使用绝对路径：

```bash
task_root="$PWD/workspace/worktrees/example"
mkdir -p "$task_root"
git -C workspace/platform fetch origin
git -C workspace/platform worktree add -b fix/example "$task_root/platform" origin/develop
```

架构仓库需要同一任务的工作树时，将其放在同一任务目录的 `architecture` 中。该工作树的本地 `workspace` 可指向同级模块工作树，联调也支持 `PLATFORM_PATH`、`WEB_PATH`、`ADMIN_PATH` 指定路径。工作区目录均由 Git 忽略。

## 启动与联调

分别在 platform 执行 `make run`，在 Web 和 stuhelper-admin 执行 `make dev`。默认端口依次为 8080、5173、5174，客户端代理通过 `STUHELPER_API_TARGET` 指定 API 地址。页面提供八种语言和开发状态，真实身份适配器由 SSO 接入任务实现。

```bash
npm run test:e2e
```

联调使用任务端口 18780—18782，在结束时停止自有服务。

## 固定组合与契约

`workspace.lock.json` 保存集成测试的精确源码组合。代码仓库提交并通过检查后，运行以下命令更新组合：

```bash
node scripts/workspace.mjs contracts
node scripts/workspace.mjs snapshot --write
```

集成 CI 在空目录中按该组合检出。客户端的 `contracts/platform.source.json` 记录所消费的提供方版本、提交和摘要，检查器验证来源快照与当前提供方兼容性。兼容的提供方升级允许客户端继续使用已有版本。

正式部署使用 ops 中的版本 tag 和镜像核验记录。源码组合记录用于开发验证。
