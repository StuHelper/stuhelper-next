---
type: design
status: Accepted
updated: 2026-10-24
---

# 独立 SSO 与应用边界

SSO 使用官方未经修改的 Casdoor 发行物，独立数据库、部署与更新生命周期。业务模块关闭或升级不影响统一登录。AI、Store 等应用分别通过 OIDC 接入，不依赖主站服务启动。

身份接入保留 issuer、subject 与既有外部绑定，业务不得按邮箱或手机号猜测合并用户。应用通过官方接口使用身份能力，不直接访问 Casdoor 数据库。

详细身份设计与运维方案迁至 [私有 SSO 设计](https://github.com/StuHelper/stuhelper-sso/blob/develop/docs/design/independent-sso.md)。公共客户端接入原则继续见[原生端设计](native-clients.md)。
