---
type: guide
status: Accepted
updated: 2026-10-24
---

# SSO 候选工具的位置

官方候选解析工具及候选记录已移至私有 stuhelper-sso 仓库，使用方法见 [候选解析指南](https://github.com/StuHelper/stuhelper-sso/blob/docs/import-module-design/docs/guide/sso-candidate.md)。

工具通过 `gh api` 查询 GitHub release 与 tag，通过 Registry API 查询 Docker Hub manifest。部署引用使用明确版本 tag，digest 单独保存为核验记录。工具保持公开元数据解析用途，候选记录验证继续在该仓库执行。本公开仓库只检查跨模块架构、文档和依赖声明。
