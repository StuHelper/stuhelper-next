# 事实、来源与未验证范围

核查日期：2026-10-23（Asia/Shanghai）。公开文档只保存非敏感结论，不包含生产配置、凭据、原始身份或数据库快照。

| 项目 | 本次核实结果 | 证据边界 |
| --- | --- | --- |
| 官方 Casdoor release | 最新稳定版本 v4.23.0，2026-10-21 发布，tag 解析 commit 为 `1b91d9d319a127e9b1af88fa7a20bb35c052b9d8` | GitHub release 与 tag API；不是生产部署事实 |
| 官方 Docker 候选 | 固定 registry manifest / platform digest | `ops/sso/candidate.json`；不等于来源资格、迁移或登录验收 |
| SSO 公网 discovery | issuer 为 `https://sso.stuhelper.com`；authorize/token/userinfo/JWKS 同源，公开声明 S256 | 只读公开请求；版本接口要求认证，未据此推断当前线上版本 |
| 现有主仓库最新 develop | 已采纳直接官方 Casdoor 原件路线；旧源码补丁已退出维护；已有原生消费契约 | 刷新远端后的 ADR-0016、native-casdoor-consumer 和维护文档；不是生产完成证据 |
| AI 与 Store | 本地代码显示 OIDC/Generic OAuth 映射、PKCE/session 与管理员官方 API 契约 | 未读取生产凭据、未进行真实账号登录 |
| 自建 runner | 组织组 stuhelper-arc，scale set 标签 stuhelper-arc-sh-k8s 在线，允许公共仓库 | 组织设置页面只读核实；实际任务执行以 Actions run 为准 |

初始本地 StuHelper 分支落后于 develop，仍包含历史补丁；设计依据已改为刷新后的远端文档。旧设计、历史演练和新版本候选不能混成当前运行事实。

官方资料：

- [Casdoor v4.23.0 release](https://github.com/casdoor/casdoor/releases/tag/v4.23.0)
- [Casdoor v3 → v4 升级](https://casdoor.ai/docs/deployment/upgrade-v3-to-v4/)
- [Casdoor 升级入口与二进制/Docker 差异](https://casdoor.ai/docs/deployment/upgrade/)
- [Casdoor 数据库迁移](https://casdoor.ai/docs/deployment/db-migration/)
- [Casdoor Docker 部署](https://casdoor.ai/docs/basic/try-with-docker/)
- [GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [GitHub Actions 安全使用](https://docs.github.com/en/actions/reference/security/secure-use)
- [Android Jetpack Compose](https://developer.android.com/compose)
- [Apple SwiftUI](https://developer.apple.com/swiftui/)
- [Huawei ArkUI](https://developer.huawei.com/consumer/cn/arkui/devstart/)
- [原生 App OAuth：RFC 8252](https://www.rfc-editor.org/rfc/rfc8252)

微信登录/web-view 及 HarmonyOS 的详细 SDK 支持仍需在对应客户端原型中核验当前平台文档与真机行为，不能凭本提案承诺平台审核或上架通过。
