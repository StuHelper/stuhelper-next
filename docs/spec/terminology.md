---
type: spec
status: Accepted
updated: 2026-10-24
---

# 统一业务术语

## 用法

当前业务、文档、接口与界面使用下表术语。API 标识保留稳定的英文形式，界面按语言清单翻译相应概念。认证流程、当前资格和访问权益分别表达。

| 标准中文 | English | 接口标识 | 定义 | 替代表述 |
| --- | --- | --- | --- | --- |
| 有效校园资格 | Campus eligibility | `campus_eligibility` | 普通认证、已认证校友或未过期临时新生所提供的当前资格 | 有效学生资格、学生认证通过、已认证学生 |
| 学生认证 | Student verification | `student_verification` | 核验学习经历和身份归属的流程及结果 | — |
| 独立实名 | Identity verification | `identity_verification` | 独立的实名核验结果 | — |
| 选课记录 | Course enrollment | `course_enrollment` | 从获准教务来源取得的本人课程与任课关系 | — |
| 任课教师 | Course instructor | `instructor` | 本人某次选课实际关联的授课教师 | — |
| 教学班 | Teaching class | `teaching_class` | 学期开课下的班级及授课来源对象 | — |
| 能力 | Capability | `capability` | 模块提供的功能或允许执行的操作 | — |
| 授权范围 | Authorization scope | `authorization_scope` | 管理员或应用获准操作的对象集合 | — |
| 资料访问权 | Resource entitlement | `resource_entitlement` | 单独授权、群体权益或交易产生的资料访问依据 | — |
| 积分 | Points | `points` | 按独立账户管理的整数额度 | — |
| Ivory | Ivory | `ivory` | 站内余额计价单位 | — |
| 修订号 | Revision | `revision` | 同一业务对象单调递增的状态版本 | — |

OIDC `scope` 表示身份协议中的请求范围；业务授权范围按业务接口表达。数据库 `schema`、事务 `outbox` 和事件 `revision` 保留技术含义。术语检查针对当前仓库文档正文中的替代表述，术语表自身保留用于检查的映射。
