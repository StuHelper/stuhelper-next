---
type: design
status: Accepted
updated: 2026-10-24
---

# 身份能力与私有认证边界

学生资格与独立实名是两个不同状态，登录由独立 SSO 提供。公共业务模块按动作规则查询所需资格，不读取认证材料或具体学校实现。

认证流程、学校方法、身份归属和材料管理的完整设计迁至 [私有认证设计](https://github.com/StuHelper/stuhelper-verification/blob/develop/docs/design/student-identity.md)。学校接入由私有 campus-adapters 模块维护。

公开接口只提供获授权业务需要的状态、范围、有效期与稳定标识。用户可从个人中心进入认证流程并查看自己的结果，具体步骤由私有认证服务提供。认证变化不直接删除其他业务内容或资产，使用方按各自规则处理。

模块与仓库归属见[多仓库设计](module-repositories.md)。
