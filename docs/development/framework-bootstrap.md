---
type: development
status: InReview
updated: 2026-10-24
---

# 框架搭建记录

## 目标与进度

进度：框架代码与本地验证完成，PR 待合并。按项目负责人要求先完成工程框架，具体业务实现暂缓。多仓库工具已确认使用 Mani，Admin 使用最新版稳定 Vben Admin 的官方默认应用。

## 当前范围

- 架构仓库：Mani 清单、工作区入口、Go Workspace、接口快照核对与文档。
- platform：模块声明、依赖验证、Fx 生命周期、HTTP 与访问控制接口、远程模块连接、OpenAPI 类型生成。
- Web：Vue 应用布局、真实接口状态、错误恢复与构建检查。
- Admin：Vben Admin v5.7.0 默认 web-antd 应用及 StuHelper 框架接入。

## 实施边界

业务模块未实现，私有仓库继续维护设计与规格。认证、实名、账务、学校查询、课程评价、群管理和数据迁移均不在本轮实现范围。原生端和社交模块继续搁置。

模块启停目前使用配置与重启。没有在线启停管理 API，没有真实身份适配器。框架测试采用合成模块与本机 HTTP 服务。

## 验证记录

本地已执行以下检查：

| 范围 | 结果 |
| --- | --- |
| 平台 | OpenAPI 3.1 校验、生成一致性、gofmt、go vet、Go race 测试与二进制构建通过 |
| Web | 类型检查、零警告 lint、10 项接口测试与生产构建通过 |
| Admin | 冻结锁文件安装、类型检查、零警告 lint、36 个测试文件的 319 项测试与生产构建通过 |
| 联调 | 真实 API 加生产构建预览，桌面与移动端共 8 项检查通过，截图已查看 |
| 文档 | 64 篇 Markdown、7 项文档检查器回归、10 项 Python 回归、严格 MkDocs 构建与 actionlint 通过 |
| 工作区 | Mani 真实检出 3 个公开代码仓库和 5 个私有文档仓库，独立构建与契约快照一致性通过 |

远程 CI 曾暴露两项本地环境差异。Admin 的上游测试使用带斜杠的正则判断时区，误拒绝 UTC，已改为使用 Intl 验证实际时区。平台 HTTP 测试未清理自有连接，已先关闭客户端连接再停止服务；原失败可复现，修复后的同一测试连续执行 30 次通过。未使用的 Git hook 自动安装依赖已移除，避免全新安装生成额外配置文件。

各代码仓库的当前检查和实际合并状态见对应 PR：

| 仓库 | 已验证源码提交 | PR |
| --- | --- | --- |
| platform | 08c3e3d893001a7b3748b03b51c700eab56fb466 | [platform #1](https://github.com/StuHelper/stuhelper-platform/pull/1) |
| Web | 777f1e54287592657123b9745dc5ef9940633202 | [Web #1](https://github.com/StuHelper/stuhelper-web/pull/1) |
| Admin | 095dfe7acc2f44c5e4f9bb0594eb8b9539c2c16f | [Admin #1](https://github.com/StuHelper/stuhelper-admin/pull/1) |

GitHub 普通检查使用 ubuntu-26.04，不使用 Actions 依赖缓存或 artifacts。三个公开代码仓库的 develop/main 已要求 PR 与 Framework checks，并禁止强推和删除。本文记录框架验证，真实登录、业务验收、镜像发行和生产部署均不在本轮范围。

## 后续

框架合并后，按各模块规格开始业务实现，再补充数据库、真实会话、业务权限和跨服务事务处理。正式发布、镜像发行和生产操作仍需 owner 明确授权。
