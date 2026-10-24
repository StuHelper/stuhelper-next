---
type: guide
status: Accepted
updated: 2026-10-24
---

# 开发工作区

## 准备

主机安装 Git、Mani、Go、Node.js、pnpm 和 uv。项目工具链版本以[版本清单](https://github.com/StuHelper/stuhelper-next/blob/develop/architecture/toolchains.json)为准。完整工作区需要访问清单中的八个仓库。

```bash
git clone --branch develop https://github.com/StuHelper/stuhelper-next.git
cd stuhelper-next
make setup
mani sync
mani run setup --tags code
node scripts/workspace.mjs go-work
```

`mani.yaml` 统一登记代码和文档仓库。GitHub 管理源码访问权限，业务系统管理运行时权限。工作区命令通过原生 `go work init/use` 加入当前已检出的 Go 模块，并保留已有自定义条目和注释。各模块同时保留自己的独立构建入口。

架构仓库可通过 `make hooks` 启用本地提交与推送检查，安装范围和已有 hook 的处理见[检查指南](repository-checks.md#本地提交与推送检查)。模块仓库继续使用自己的检查入口。

## 日常操作

```bash
mani run status --all
mani run fetch --all
mani run check --tags code
node scripts/workspace.mjs toolchains
node scripts/workspace.mjs contracts
```

Mani 的 `sync` 克隆缺失仓库，`fetch` 更新远端引用。分支选择和合并由各仓库的 Git 操作完成。配置保留现有 remotes、工作树和 gitignore。

Mani 0.32.1 的普通批量命令需逐项查看输出，不能只以进程返回 0 判断通过。CI 使用以下原生命令逐个执行并保留失败退出码；`--tty` 本身不切换工作目录，因此必须先进入目标项目：

```bash
config="$PWD/mani.yaml"
projects=$(node -p 'Object.keys(require("./workspace.lock.json").projects).join(" ")')
for project in $projects; do
  (cd "workspace/$project" && mani --config "$config" run check --projects "$project" --tty) || exit $?
done
```

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
pnpm run test:e2e
```

联调使用任务端口 18780—18782，在结束时停止自有服务。

## 集成来源

架构仓库维护一份可复用 GitHub workflow。platform、Web 和 stuhelper-admin 在独立检查之后调用相同版本，执行生成、契约、工具版本和八语言浏览器联调。所有步骤使用 GitHub 标准 runner、读取权限和临时凭据。依赖缓存按 [CI 规格](../spec/ci-runners.md)限制大小和写入范围，不上传 artifact。

| 场景 | 源码选择 |
| --- | --- |
| 普通 PR | 当前 PR 的 GitHub 测试合并提交，加其余仓库最新 develop |
| 多仓配套 PR | 当前候选优先，指定其他配套 PR，其余使用最新 develop |
| develop 推送 | 当前触发提交，加其他仓库最新 develop |
| fixed | 选定架构版本中 workspace.lock.json 记录的模块组合 |
| replay | 完整使用此前记录的架构、模块、协调器和工具版本 |

最新来源在运行开始时解析一次，随后按 SHA 检出。CI 的 Step Summary 和日志记录架构仓库、三个代码仓库、协调器及工具版本。普通源码变化无需更新固定组合。

配套 PR 在本仓库 `.github/integration.json` 中登记所属 PR 编号和候选。配置只对该 PR 生效，后续 PR 和 develop 推送不继承该覆盖。例如 Web PR 2 与架构 PR 3、platform PR 2 配套：

```json
{
  "pull_request": 2,
  "candidates": {
    "architecture": "pr:3",
    "platform": "pr:2"
  }
}
```

候选也可以使用完整 SHA。配套 PR 必须指向声明仓库的 develop。已经合并的 PR 自动使用最新 develop；关闭且未合并的 PR 要求修正配置。当前 PR 自身的提交始终优先于配套配置。

## 记录、重放与差异

本地解析最新组合并保存记录：

```bash
node scripts/workspace.mjs resolve --output /tmp/integration.json
```

在 CI 手动运行时，将 summary 中的 JSON 放入 `replay` 输入即可重放。工作流先检出记录中的协调器，再检出架构和模块，保持原始提交。手动候选覆盖放入 `candidates` JSON 输入。

本地重放先在独立空工作区检出记录中的架构提交，安装依赖，再运行：

```bash
node scripts/workspace.mjs checkout --replay /tmp/integration.json
mani run setup --tags code
mani run check --tags code
node scripts/workspace.mjs toolchains --remote
node scripts/workspace.mjs contracts
pnpm run test:e2e
```

重放要求模块目录不存在，保留已有工作树。记录文件使用独占创建，避免覆盖先前的输入。`status --replay /tmp/integration.json` 比较记录提交与最新 develop，输出相同、领先、落后或分叉及提交数，候选领先和分叉作为信息呈现。

固定候选需要各代码仓库提交并通过检查后执行 `snapshot --write`。完整重现一轮检查使用该轮记录；`workspace.lock.json` 只保存固定模块组合与工具发行版本。

客户端的 `contracts/platform.source.json` 记录所消费的提供方版本、提交和摘要，检查器验证来源快照与当前提供方兼容性。正式部署使用 ops 中的版本 tag 和镜像核验记录。
