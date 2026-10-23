---
type: development
status: InReview
updated: 2026-10-24
---

# 文档架构与检查工具

## 目标、范围与进度

进度：已完成。首版文档架构和检查工具已完成本地与远端验证，通过 [PR #1](https://github.com/StuHelper/stuhelper-next/pull/1) 交付，合并状态以 PR 为准。按项目负责人指定的 project-docs-starter 重写首版方案，并记录官方 Casdoor 镜像与 BJ1 镜像任务的 runner 分工。本记录保存文档工具首次交付的结果。后续业务补充见[业务整理记录](business-design-extraction.md)。

## 来源与确认依据

已读取[模板基线](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0)的 README、AGENTS、authoring、五类模板/索引、检查器说明及 MkDocs 配置。项目采用其分类与生命周期，内容和检查器按本仓库实际需要实现；不引入上游演示业务或浮动工具版本。

2026-10-23 项目负责人明确要求使用官方 Casdoor 镜像，Docker build 因 Registry 位于 BJ1 而使用自建 runner，并指定本套文档架构。三项决定分别记录在[ADR 索引](../adr/README.md)。产品细节仍保留 InReview。

## 原内容的归属

| 原主题 | 当前权威位置 |
| --- | --- |
| architecture | [平台机制](../design/platform-architecture.md)、[模块行为](../spec/module-lifecycle.md) |
| domain-model | [内容概念](../design/academic-content.md)、[课程规格](../spec/academic-content.md)、[社交规格](../spec/social-content.md) |
| sso-migration | [SSO 设计](../design/independent-sso.md)、[数据/兼容规格](../spec/sso-compatibility.md)、[迁移任务](sso-migration.md) |
| sso-compatibility | [兼容行为与矩阵](../spec/sso-compatibility.md)，代码观察移入迁移任务 |
| native-clients | [原生设计](../design/native-clients.md)、[客户端行为](../spec/native-clients.md) |
| ci | [runner 规格](../spec/ci-runners.md)、[操作指南](../guide/ci-runners.md)、[runner ADR](../adr/0002-runner-placement.md) |
| roadmap | [分阶段计划](rewrite-roadmap.md) |
| research | SSO 事实进入迁移任务，工程事实进入重写计划，外部来源跟随所属主题 |

旧平铺文档删除并同步修复 README、AGENTS、CONTRIBUTING、工具说明与工作流引用；历史内容由 Git 保留。

## 任务与验收准备

- [x] 阅读固定上游，明确分类、状态与导航规则。
- [x] 按设计、行为、工作、操作和决策重写原方案，保留已知边界与未决事项。
- [x] 明确普通检查与镜像任务的 runner 分工，官方 Casdoor 不增加构建任务。
- [x] 完成五类模板/索引、文档检查与严格构建，核对全部旧链接已修复。
- [x] 执行检查器回归与完整本地检查。
- [x] 核对精确提交的远端 CI，首个验证提交与 run 见下表。
- [x] 按仓库规则通过 PR 交付，并记录实际结果与剩余限制。

## 验证与交付

本地环境为 Linux x86_64、Node.js 24.22.1、uv 0.12.18；MkDocs 由锁定环境中的 Python 3.13.15 执行。

| 检查 | 实际结果与范围 |
| --- | --- |
| `python3 scripts/check.py` | 通过：Python/JSON 语法、13 个模块声明和候选元数据 |
| `npm run check:docs` | 通过：37 份 Markdown 的格式、元信息、本地链接与标题锚点 |
| `npm run test:docs` | 7 项通过，覆盖元信息、坏链接、模板例外、越界与 lint 错误输出 |
| `python3 scripts/lint_workflows.py` | actionlint 1.7.12 通过 |
| `uv run --locked mkdocs build --strict` | 通过：五类导航、全部页面和链接的静态构建 |
| 本地浏览器 | 平台架构、课程关系、SSO 状态图均实际生成 SVG；主题导航正常 |
| Node 依赖审计 | 锁定依赖安装后的 npm audit 为 0 vulnerabilities |
| GitHub 托管 CI | 提交 `4eb8f5ff27dbb4d9506de02859522d08ba40836b` 的 [run 39963320509](https://github.com/StuHelper/stuhelper-next/actions/runs/39963320509) 成功，执行全部新增检查 |

格式检查直接调用 markdownlint library，避免引入当前 CLI2 的未修复 braces/glob 依赖链；picomatch 使用 4.0.7，间接 KaTeX 固定为修复版 0.18.2。固定依赖和检查器一起通过回归，不通过关闭规则消除错误。

本表保留首个已验证实现提交的回执；后续仅补充交付记录时仍运行 CI，最终 HEAD 的结果由 [PR checks](https://github.com/StuHelper/stuhelper-next/pull/1/checks) 展示。首次建仓的旧 CI 结果不能替代此次验证。

SSO 生产切换、真实账号登录、镜像与移动端构建的进度由对应开发记录维护。

## 2026-10-24 工程约定调整

项目负责人要求普通托管检查使用 Ubuntu 26.04，版本引用使用明确 tag，并补充 Docker 测试清理与免费组织账号的 Actions 存储规则。三个 Actions tag 已核对，均指向改动前固定的同一提交。自建 runner 保留现有组和标签，其操作系统升级由项目负责人手动完成。

当前文档检查显式关闭 npm 和 uv 的 Actions 缓存，不上传文档构建 artifact。通过 GitHub API 只读查询，本仓库当时缓存数量和大小均为 0，artifact 数量也为 0。未调整缓存额度、付费设置或其他仓库的缓存。

课程模型改为 `TermCourse = Course + Term`，同一课程和学期只有一个对象，教学班由 `TeachingClass` 单独表示。新增了同学期多班、跨学期和历史班级未知三个验收场景。课程与教师评分等其他已确认规则沿用原有文档。

本轮本地检查通过：Python/JSON 与模块声明检查、Markdown 格式与元信息/链接检查、7 项文档检查器回归、MkDocs 严格构建及 actionlint。浏览器实际生成包含 TermCourse 和 TeachingClass 的关系图 SVG。actionlint 1.7.12 尚未收录 Ubuntu 26.04，配置只补充官方已提供的精确标签；错误标签仍会被拒绝。

已迁入私有 SSO 仓库的候选工具同步采用 `gh api`，镜像拉取地址改用版本 tag，摘要单独保存。公开仓库保持工具迁出的状态，相关解析器测试与元数据实查结果见[SSO 迁移记录](sso-migration.md)。上述工程调整核验时尚未提交或发起远端 CI，最终提交结果以本轮文档迁移 PR 为准。没有构建、拉取或运行 Docker 镜像，也没有升级自建 runner 或执行生产部署。
