# SSO 消费者兼容与验收契约

“兼容”必须包含实际账号归属、会话与权限。公网 discovery 可达、页面能打开或单元测试通过都不能单独证明已有应用登录成功。

## 稳定不变量

- issuer 保持 `https://sso.stuhelper.com`，包括协议、路径和尾斜杠语义；每个应用保留原 client ID 和准确回调 URI。
- 对已有账号，subject 必须与切换前字节一致。新业务内部使用 `(issuer, sub)` 唯一绑定稳定 `user_id`；不得按 email、手机号或显示名自动重新关联。
- 公钥、kid 与历史签名验证保持兼容；正常轮换需重叠发布新旧 key 至存量 token 过期。验证签名、issuer、audience、expiry、state、nonce 和 PKCE 的责任不能因升级省略。
- 不更改 AI 的订单/额度/余额归属、Store 的订单和账户绑定；这些数据不是 SSO 迁移的写入目标。
- 身份禁用、删除、组织范围及管理员降权必须按各消费方既有契约生效。普通 roles claim 不能替代服务端管理员权威。
- SSO 暂时不可用与主体非法应区分：依赖故障不能被伪装成身份更换、自动新建账号或自动解绑。

## 核查重点

| 消费者 | 已检查的代码路径所体现的契约 | 仍需实际核实 |
| --- | --- | --- |
| stuhelper-ai | 存在内置 OIDC 和可配置 Generic OAuth 两条路径；Generic 根据配置的用户标识/username/email selector 映射账号 | 生产使用哪条 provider、selector、userinfo 包装/字段类型、访问条件，以及既有绑定稳定性 |
| stuhelper-store 客户 | OIDC code + state/nonce/PKCE、issuer/client 校验、subject 绑定、refresh 后 subject 一致性 | 生产 client 配置、存量账号登录/续期/重登、布尔字段形态、依赖故障 |
| stuhelper-store 管理端 | 从本地有效会话调用官方 get-account，核对 subject、目标组织、IsAdmin、forbidden/deleted | 候选原生 API 策略下普通与管理员账号行为，降权和禁用 |
| 当前 StuHelper | 已有官方 Casdoor 适配设计；账号补全与开放平台授权代次在业务侧 | 已部署版本与实际配置；已有开放平台客户端是否依赖 resource 交换或历史扩展 |
| Payment / 机器人 / 其他应用 | 待清点，不因用户举例 AI/Store 而漏掉现有应用 | 全量已注册 application 与实际消费清单的对应关系 |
| Next 原生客户端 | 新 client 独立注册，Authorization Code + S256 PKCE | 每端 redirect、设备存储、取消/恢复、退出和 refresh 策略 |

以上代码检查针对工作副本，不等于生产配置或当前生产镜像事实。尤其 AI 的自定义 claim selector 不可根据字段名猜值；应在受控进程内比对旧/新结果和原绑定。

## 必须执行的矩阵

对旧版本和候选运行同一套测试，并记录准确镜像、客户端版本、非敏感结果与执行时间：

| 场景 | 必需结果 |
| --- | --- |
| 已有普通账号从 AI/Store 登录 | 回到原业务 user ID；订单/额度/资料归属保持，未创建重复账号 |
| 已登录 SSO 后跨应用登录 | 无须重新提供账号凭据（若既有策略本就要求重新认证，保留明确策略） |
| 管理员与普通账号 | 管理员可用、普通账号不可越权；组织范围不扩大 |
| subject / iss / aud 不符 | 拒绝，不自动修复或重绑 |
| state、nonce 错误和 code 重放 | 拒绝；合法一次性 callback 成功 |
| refresh 与旧会话 | 合法续期仍属原用户；轮换失败不会丢失有效本地会话或换号 |
| logout 与再次登录 | 本地注销和全局注销语义分别验证，不假设 OIDC 登录自动实现全局单点退出 |
| 降权、禁用、删除 | 按既有即时/有效期策略拒绝受保护操作，无旧权限复活 |
| 密码、MFA、passkey、已配置上游 provider | 每个实际启用方式有验收证据；未执行项明确 pending |
| SSO 网络故障 / JWKS 更新 | 已知 key 合法 token 与需实时校验操作按契约处理；未知 key 不放行 |
| 浏览器 v4 页面 | authorize、signup、forgot-password、同意页、主题、资源路径和回调正确 |

凭据、token、cookie、原始 userinfo、数据库行、真实用户截图不得出现在公共仓库和 Actions artifact。合成数据可在标准托管 runner 测试；生产数据演练只能在受控环境执行。真实登录验证的成功回执只包含测试项和匿名结果。

## 完成标准

全量消费者清单无遗漏；每个必需项真实通过；数据库恢复实际演练；运行镜像与锁定候选一致；原账号绑定一致。任何 pending/skipped 项都阻止宣称“所有系统已正常登录新版 SSO”。本次尚未执行该矩阵。
