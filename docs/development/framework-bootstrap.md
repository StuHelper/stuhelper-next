---
type: development
status: Accepted
updated: 2026-10-26
---

# 框架实施状态

## 当前实现

platform 提供公共模块接口、依赖校验、能力降级、Fx 生命周期、HTTP 授权边界和可选远程连接。模块描述由其仓库的 `module.yaml` 生成，主仓库验证规格归属和公开能力一致性。

私有 backend 承载正式程序入口，已装配 platform 与存储、通用文件服务。公共示例位于 platform 的 `examples/server`。verification、campus-adapters、billing 尚未装配到正式业务入口。storage-bhpan 独立提供 BHpan Go 存储适配库，其公开协议与脱敏验证记录由适配器仓库维护，真实存储集成见存储主题。

通用存储已有独立库，实现多账号准入、三副本、两份发布门槛、恢复与清理，见[实施状态](storage-module.md)。media 已实现文件上传、批准、引用与下载，backend 固定依赖联调通过。resources 与贡献管理仍待实施，生产环境未开放。

Web 与 stuhelper-admin 提供状态展示、错误恢复和八语言入口。Admin 另有存储运营页面，接口、权限和验收范围见[存储实施状态](storage-module.md)。国际化检查覆盖消息键、占位符、复数、数字、金额、日期、时区、相对时间和 RTL。

共享检查器、GitHub action、reusable workflow 与 Lefthook 预设已迁至 stuhelper-tooling。主仓库保留架构、Mani、工作区工具和应用联调。SSO 官方制品资料归 ops，后端身份实现归 backend。

## 验证入口

| 范围 | 检查 |
| --- | --- |
| 工具库 | 检查器、暂存快照、日志与失败路径测试 |
| 架构 | 模块依赖、规格归属、工具链、文档与 Actions |
| platform | Go race、vet、构建、生成一致性、契约和导入边界 |
| backend | GOWORK=off 的正式依赖构建与检查 |
| storage-bhpan | 独立 Go 存储适配库、协议夹具、race、vet 与场景映射 |
| Web/Admin | 类型、lint、国际化、客户端用例与应用构建 |
| 公开组合 | 契约来源、兼容性与八语言桌面/移动浏览器测试 |
| ops | Compose、镜像引用、官方 SSO 候选与部署工具测试 |

本轮本地通过 33 项共享工具测试、14 项架构与工作区测试、Web 24 项测试、Admin 333 项测试和 80 项八语言浏览器测试。Go 框架与 backend 正式依赖构建、三个 Dockerfile 及隔离镜像组合检查均通过。

platform v0.1.0 与 tooling v0.1.0/v0.1.1 已建立不可变版本。已切换消费者的远端检查逐仓验收。真实账号、Registry 发行授权、部署环境接入和生产迁移仍由相应任务处理。

## 剩余实施

业务 API、数据库迁移、真实身份接入、校园数据导入、评价、文件、账务和查询仍按各自规格推进。评价资格使用选课记录，教师选项来自本人任课记录，具体行为见[评价规格](../spec/academic-content.md)。

首次持久化业务写入同时落实幂等、数据访问身份和必要事件；首次身份查询落实查看审计。真实账号、SSO 生产迁移和生产部署继续由相应任务授权和验收。
