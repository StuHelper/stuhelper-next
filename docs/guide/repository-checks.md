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
npm run test:e2e
```

## 脚本与测试的职责

| 入口 | 验证内容 |
| --- | --- |
| `scripts/check.py` | 模块归属、依赖图、规格引用、文件类型及语法 |
| `scripts/workspace.mjs` | Mani 清单、工具链、Go Workspace、固定源码组合与契约来源 |
| `scripts/lint_workflows.py` | 固定版本 actionlint 的下载、校验与运行 |
| `.github/check-docs/` | 文档格式、元信息、链接、导航与术语规则 |
| `scripts/test_*.py`、`scripts/workspace.test.mjs` | 错误清单、优化模式、快照篡改与工作区保护等回归 |
| `tests/e2e/` | 实际 HTTP、客户端错误恢复、八语言页面与移动端布局 |

platform 的独立检查还覆盖 Go race、导入边界、OpenAPI 和生成一致性。Web 与 stuhelper-admin 的检查覆盖类型、lint、八语言键与占位符、复数和格式化、共享客户端行为及生产构建。

## 预览与结果

```bash
uv run --locked mkdocs serve --dev-addr 127.0.0.1:8000
```

严格构建生成 `site/`。依赖目录、站点、工作区和测试输出由 Git 忽略。结果按命令退出码与实际范围记录在 PR、CI 和当前实施状态中。

普通检查使用锁文件并关闭 Actions 缓存及 artifact。actionlint 的精确 runner 标签兼容配置只补充 `ubuntu-26.04`。

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

规格的验收表使用稳定场景编号。模块完成某个场景后，在模块清单的 `scenario_tests` 中登记实际测试函数；工作区契约检查核对规格编号和测试函数存在性，模块自身检查负责执行测试。当前平台登记 MOD-06 至 MOD-09，业务场景随对应实现登记，未登记项保留为待实施。
