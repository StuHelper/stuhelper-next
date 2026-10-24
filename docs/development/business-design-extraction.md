---
type: development
status: Accepted
updated: 2026-10-24
---

# 旧业务文档抽取与模块迁移

## 结果与范围

旧业务的产品选择已逐项确认或明确延期，规则写入公共业务规格及对应私有模块。来源固定为旧仓库提交 `a0a998688a623da7811d04037efe0829c0783267`，167 份文档的分类与主要业务映射见[来源覆盖](business-migration-coverage.md)。

## 业务文档

课程评价、教师评分与导师评论分别定义。课程有五维评分，教师评分先计算课程均值，再对课程等权汇总；教师主页展示所授课程及其均分，导师评论使用六段可编辑模板且不评分。匿名、讨论身份、短时撤回、草稿、举报与审核均有明确规则。

资料、目录课表、个人账号、通知、群管理、信息查询、开放平台、存储贡献、后台配置与娱乐业务均已确认。批量、导出、字段权限、群消息规则、聊天工作台和事件订阅已补齐。各动作资格及运营参数遵循配置规则。

完整结果见[业务确认清单](business-decisions.md)，各规格的验收场景用于后续实现，不作为已经完成的业务测试。

## 多仓库与私有内容

项目按业务模块划分仓库，各模块独立拥有接口、数据、版本与生命周期。[多仓库设计](../design/module-repositories.md)与模块清单记录归属，不把前后端分仓等同于业务模块隔离。

已创建并核实以下仓库为 private：

| 仓库 | 接收内容 |
| --- | --- |
| [stuhelper-verification](https://github.com/StuHelper/stuhelper-verification) | 学生认证、独立实名及认证管理的详细设计与规格 |
| [stuhelper-campus-adapters](https://github.com/StuHelper/stuhelper-campus-adapters) | 学校接入边界与适配模块设计 |
| [stuhelper-billing](https://github.com/StuHelper/stuhelper-billing) | 货币、交易、会员与奖励及退款规格 |
| [stuhelper-sso](https://github.com/StuHelper/stuhelper-sso) | 独立身份设计、兼容与迁移文档、官方候选工具及检查 |
| [stuhelper-ops](https://github.com/StuHelper/stuhelper-ops) | 生产组合设计、来源清单、旧确认快照与数据迁移范围 |

公开仓库保留必要用户入口与对接说明。具体认证方法、学校数据方案、账务规则与生产配置不再在公共文档重复。按项目负责人决定，公共仓库保持 public，已有公开历史不重写。

## 当前实施范围

当前只推进 Web 与 stuhelper-admin。社交独立延期，微信小程序、Android、iOS 与 HarmonyOS 搁置。旧数据仅规划迁移完整 SSO 与学生认证数据及必要映射，不迁移独立实名结果和其他旧业务数据。本轮没有搬运或删除真实数据。

## 检查与交付

检查包括 Markdown 格式、元信息、本地链接与锚点、检查器回归、模块仓库归属与私有范围、依赖图、GitHub Actions 语法和 MkDocs 严格构建。SSO 候选元数据检查保留在私有 SSO 仓库。

公开仓库新增模块清单错误场景回归，验证私有模块误设为公开、重复仓库归属、依赖环和未知提供方均被拒绝。图表在浏览器中核实实际渲染。各仓库的精确提交结果随 PR checks 记录。

平台运行时与客户端框架的当前范围见[框架状态](framework-bootstrap.md)。支付、学校接入、业务服务、SSO 生产迁移和部署按对应模块继续实施。
