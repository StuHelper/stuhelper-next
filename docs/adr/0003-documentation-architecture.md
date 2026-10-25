---
type: adr
status: Accepted
updated: 2026-10-25
---

# 0003：采用 project-docs-starter 文档架构

## 背景与决定因素

首版设计把总体架构、规则、迁移计划、实际调研和操作方法平铺在 `docs/` 中。后续开发需要分别维护目标行为、实现机制和验证证据，并让开发者与 Agent 沿主题继续工作。

## 决策与确认依据

采用项目负责人于 2026-10-23 指定的 [project-docs-starter](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0) 架构，基线 commit 为 `1c4c6bb1bd401b803ea986b404932926cfc95eb0`。

文档分为 design、spec、development、guide 和 adr；各类提供入口和模板，使用 `type/status/updated` 元信息，区分确认状态、工作进度和验证结果。每条完整规则只维护一处，通过链接组织设计、场景、任务与操作。

## 适配与取舍

按本项目重写内容与模板，不导入上游演示业务。采用 MkDocs Material 在开发环境预览，通过 uvx 临时提供依赖，不维护文档专用 uv 项目和锁文件。文档检查器使用本项目实现和公开包，检查格式、元信息、本地链接与锚点，并与既有 CI 集成。

根 README、AGENTS、CONTRIBUTING 和工具目录说明保留其工程入口职责，主题正文统一进入五类目录。移除旧平铺文本并修复引用，历史由 Git 保留。

## 后果与验证

新文档按主题选择必要章节，不要求每次修改新增全部五类文档。Markdown、元信息、链接和导航检查可发现文本问题，内容真实性仍由来源与实际验收支持。适配范围、文件映射与本次结果见[文档工作记录](../guide/repository-checks.md)。
