---
type: index
status: Accepted
updated: 2026-10-29
---

# StuHelper Next 文档

StuHelper Next 是现有 StuHelper 的重构版本，Next 为过渡名称，未来以 StuHelper 名称继续维护。已确认保留的校园业务、身份规则和货币设计从[业务范围](design/business-scope.md)进入；采用独立官方 Casdoor SSO 与按业务模块划分的多仓库，当前只推进 Web 和 stuhelper-admin。

学生认证、课程与导师评价、资料审核下载已有统一候选，并通过正式应用的隔离组合验收。真实外部账号、生产交付与迁移仍待验收，详见[框架状态](development/framework-bootstrap.md)。

本项目按 [project-docs-starter](https://github.com/lihaotong0712/project-docs-starter/tree/1c4c6bb1bd401b803ea986b404932926cfc95eb0) 的五类文档架构组织资料。写作规则见[文档维护约定](authoring.md)。

| 分类 | 阅读目的 | 入口 |
| --- | --- | --- |
| design | 理解目标、概念、架构和实现机制 | [项目设计](design/README.md) |
| spec | 查询预期行为、边界与验收场景 | [功能与模块规格](spec/README.md) |
| development | 查看调研依据、工作计划、进度和实际验证 | [开发工作](development/README.md) |
| guide | 执行已有工具、检查或维护任务 | [操作指南](guide/README.md) |
| adr | 追溯重要决定及取舍 | [决策记录](adr/README.md) |

首次阅读从项目设计进入；继续实施从开发工作进入。文档的 `Accepted` 表示其声明范围已确认，功能是否实现和验证须查看对应开发记录。
