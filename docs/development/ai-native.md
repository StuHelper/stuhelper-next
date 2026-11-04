---
type: development
status: Accepted
updated: 2026-11-04
---

# AI native 实施

## 当前范围与状态

进度：规格和架构已确认，代码尚未开始。assistant 和 planner 模块只在清单中登记，仓库尚未建立。规则见 [Agent 助手规格](../spec/agent-assistant.md)和[个人日程规格](../spec/personal-planner.md)。

## 与现有实现的差距

以下结果来自 2026-11-01 对各仓库 `origin/develop` 的只读检查，开工时要重新核对。

| 位置 | 现状 | 需要的修改 |
| --- | --- | --- |
| catalog `Object` | 上课时间只有自由文本 `TimeText` 和 `Location` | 增加校历、节次、结构化时间和时区，并保留原文 |
| platform `transport.Principal` | 只有 `Issuer` 和 `Subject` | 增加委托信息及上下文传递 |
| reviews 和 catalog `Principal` | 各自定义，字段不同 | 保持业务权限判断不变，审计从上下文读取委托信息 |
| 各模块 OpenAPI | 没有 Agent 工具声明 | 增加 `x-agent-tool`，由检查验证声明 |
| reviews | 没有教师比较工具和摘要读模型 | 基于现有评分统计和预览规则新增 |
| Web 首页 | 现有首页不是对话形态，社区入口为 `/community` | 改为对话首页，保留现有业务页面 |
| notifications | 尚未实现 | 主动提醒依赖该模块 |

## 跨任务依赖

Agent 的内容准入依赖 `claude/beihang-content-access` 分支的[内容准入规则](../spec/action-eligibility.md#内容准入)。本分支基于该分支，须在它合并后再合并。

服务端读接口的收紧也由该任务核对。工具网关自行检查准入，但不能代替模块接口的检查。

## 实施阶段

| 阶段 | 成果 | 完成条件 |
| --- | --- | --- |
| 基础 | 委托信息、`x-agent-tool`、工具网关、上下文校验、待确认操作、assistant 骨架和模型网关 | AG-03 至 AG-05、AG-16 至 AG-24、AG-27、AG-28 通过 |
| 只读助手 | catalog 结构化课表、对话首页和回答质量评测集 | AG-01、AG-02、AG-09、AG-10、AG-11 通过 |
| 个人助理 | planner、DDL、空闲时间和写工具 | PL-01 至 PL-15、AG-06、AG-07、AG-14、AG-25 通过 |
| 选课参考 | 教师比较、评价摘要和索引 | AG-08、AG-13 和 ACAD-41 至 ACAD-44 通过 |
| 语音 | 语音输入，然后是实时通话 | AG-15 通过，并记录实测延迟 |
| 对外 MCP | 用户本人客户端的只读工具 | AG-12、AG-16、AG-26 通过，Casdoor 授权能力完成验证 |
| 主动提醒 | planner 提醒计划、outbox 和 notifications | PL-16 至 PL-20 通过，投递失败测试通过 |

## 风险与待验证事项

- 现有模块已有候选实现，修改 catalog 和 platform 接口需要更新消费者，并按实际组合验证。
- Casdoor 对 MCP 授权的支持、模型和语音供应商、实时通话延迟、模型费用都尚未验证。
- 首期不开放免确认写操作和 MCP 写工具。重新评估前，要先有跨轮来源追踪和 StuHelper 页面内的确认入口。
- 校历和节次数据能否从现有学校来源取得，要由 campus-adapters 确认。取不到时，相关课程的时间显示为未知。
