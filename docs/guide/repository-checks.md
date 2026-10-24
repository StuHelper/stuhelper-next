---
type: guide
status: Accepted
updated: 2026-10-24
---

# 仓库检查与文档预览

## 检查入口

安装锁定依赖后，在架构仓库运行：

```bash
make setup
make check
```

该入口检查仓库清单、私有文件名、检查器回归、统一工作区、术语、Markdown、导航、工作流和文档站。工具链版本由[版本清单](https://github.com/StuHelper/stuhelper-next/blob/develop/architecture/toolchains.json)维护。

代码检查与联调分别运行：

```bash
mani run check --tags code
node scripts/workspace.mjs toolchains
node scripts/workspace.mjs contracts
pnpm run test:e2e
```

Mani 0.32.1 的普通批量模式可能在子任务失败后返回 0。人工运行时必须检查各项目结果；CI 逐项目进入目录，使用显式配置和 `--tty` 传递失败退出码。安装模块前，CI 先运行失败用例，验证 `setup` 和 `check` 都会停止后续项目。

## 本地提交与推送检查

在架构仓库安装依赖后显式启用 hooks：

```bash
make setup
make hooks
```

安装器设置当前克隆的 `core.hooksPath=.githooks`，也影响同一克隆的关联工作树。它不修改全局 Git 配置或独立模块仓库，发现其他 hook 路径或已有 hook 时停止，保留原配置。依赖安装不会自动设置 hook。

| 时机 | 对象与检查 |
| --- | --- |
| pre-commit | 暂存区快照，执行语法、私有文件名、架构和文档检查 |
| pre-push | Git 传入的实际提交，在临时检出中按 pnpm 锁文件安装后执行 `make check` |
| PR CI | 当前 PR 的合并结果，根据完整差异选择跨仓集成 |
| develop/main push 或手动 CI | 完整仓库与跨仓集成，默认解析最新源码并记录组合 |

临时检出借用本地 Git 对象，保留真实 HEAD、提交日期和历史。暂存区检查不会混入未暂存或未跟踪内容，强制暂存的忽略文件仍参与检查。推送支持多个 ref 和非 HEAD 提交，删除 ref 无需源码检查。正常结束或检查失败后删除临时检出。

每次提交只运行轻量检查。推送前的完整仓库检查需要 Go、uv 和依赖网络，不运行跨仓构建或浏览器测试。hook 仅在已安装的克隆生效，受保护分支仍以 CI 结果为准。修改依赖后先重新安装，避免暂存区检查使用旧工具。

需要撤销本次安装时，先确认 `git config --local --get core.hooksPath` 返回 `.githooks`，再运行 `git config --local --unset core.hooksPath`。

## 脚本与测试的职责

| 入口 | 验证内容 |
| --- | --- |
| `scripts/check.py` | 模块归属、依赖图、能力声明与规格引用 |
| `scripts/workspace.mjs` | Mani 清单、工具链、Go Workspace、候选组合与契约来源 |
| `tooling/cli.mjs` | 共享检查入口，通过 Go 执行固定版本 actionlint |
| `tooling/docs/` | Markdown 格式、元信息、链接、导航、术语和文档编号 |
| `tooling/i18n/` | 八语言键、占位符、复数和同英文消息例外 |
| `tooling/check_repository.py` | 文档仓库的文件类型、语法与敏感文件名 |
| `scripts/test_*.py`、`scripts/*.test.mjs` | 架构、固定组合、CI 路径、汇总结果、缓存上限与 hook 快照回归 |
| `scripts/local-checks.mjs`、`scripts/ci-cache.mjs` | 本地快照检查和上传前的缓存大小限制 |
| `tests/ci/mani-exit.mjs` | 原生 Mani 任务失败时传递退出码，并停止后续项目 |
| `tests/e2e/` | 实际 HTTP、客户端错误恢复、八语言页面与移动端布局 |

这些共享检查以 `@stuhelper/engineering-tools` 安装到八个模块仓库。源码位于架构仓库的 `tooling/`，消费者通过同一发行 tag 固定版本；工作区与消费者检查验证 tag、锁定提交和来源，升级方法见[依赖维护](dependency-maintenance.md)。

Markdown 格式采用 markdownlint，文档站采用 MkDocs strict。共享检查另外覆盖站点之外的 README、AGENTS、本地链接和项目规则。

platform 的独立检查还覆盖 Go race、导入边界、OpenAPI 和生成一致性。Web 与 stuhelper-admin 的检查覆盖类型、lint、八语言键与占位符、复数和格式化、共享客户端行为及生产构建。

## 预览与结果

```bash
uv run --locked mkdocs serve --dev-addr 127.0.0.1:8000
```

严格构建生成 `site/`。依赖目录、站点、工作区和测试输出由 Git 忽略。结果按命令退出码与实际范围记录在 PR、CI 和当前实施状态中。

普通检查使用锁文件和有大小限制的公开依赖缓存，不上传 artifact。缓存和 runner 分工见 [CI 规格](../spec/ci-runners.md)。actionlint 的精确 runner 标签兼容配置只补充 `ubuntu-26.04`。

## 故障处理

| 失败 | 处理方式 |
| --- | --- |
| 术语、链接或导航错误 | 修正对应主题和引用，重跑 `make check` |
| 工具链不一致 | 更新统一版本清单后执行 `node scripts/workspace.mjs toolchains --write`，重装依赖并检查各仓库 |
| 契约快照不一致 | 核对提供方来源，重新生成客户端快照并更新来源记录 |
| 翻译缺失或格式化失败 | 补齐八语言消息及对应行为，再运行原失败检查 |
| 下载或完整性校验失败 | 核对网络和发行来源，再运行原命令 |

Docker 测试使用任务专属资源。退出时清理本任务的容器、闲置镜像和确认可删除的缓存，保留其他任务资源与持久数据。

## 场景与实现

文档检查按可见 Unicode 字符计算段落长度，链接地址和代码块不计入 200 字上限。检查器核对 ADR 文件名与标题编号、规格场景编号唯一性、索引说明、术语别名，以及修改正文后的 `updated` 日期。日期以文件最近一次正文提交为依据，CI 重新运行不会要求修改未变化的文档。

规格的验收表使用稳定场景编号。模块完成某个场景后，在模块清单的 `scenario_tests` 中登记实际测试函数；工作区契约检查核对规格编号和测试函数存在性，模块自身检查负责执行测试。当前平台登记 MOD-06 至 MOD-09，业务场景随对应实现登记，未登记项保留为待实施。
