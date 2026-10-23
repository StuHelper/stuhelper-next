# 原生多端方案

原生优先是本提案的明确方向：共享协议与业务定义，分别实现平台 UI、导航、生命周期、存储和系统集成。Web 也是浏览器原生应用，不以移动 WebView 代替 App。

| 平台 | 建议技术 | 登录与平台能力 |
| --- | --- | --- |
| Web / Admin | TypeScript + Vue 3；公开内容需要 SEO 时采用 SSR/预渲染 | BFF HttpOnly/Secure cookie、CSRF、服务端会话，审核权限不在浏览器决定 |
| 微信小程序 | TypeScript + WXML/WXSS 原生组件 | 微信平台登录只建立平台身份；通过明确绑定接入 StuHelper SSO |
| Android | Kotlin + Jetpack Compose | 系统浏览器/Custom Tabs + PKCE、App Links、系统安全存储和推送 |
| iOS | Swift + SwiftUI | ASWebAuthenticationSession + PKCE、Universal Links、Keychain、APNs |
| HarmonyOS | ArkTS + ArkUI，面向 HarmonyOS 原生能力 | 平台支持的浏览器授权/回跳、应用安全存储和华为推送 |

这意味着多套 UI 与发行流水线的维护成本，建议分阶段交付而非同时启动五套完整产品。具体 OS 最低版本、SDK 和开发者账号在各端启动时确定。

## 共享什么

- OpenAPI、错误码、分页/过滤语义、事件定义和版本策略；生成 TS/Kotlin/Swift/ArkTS 的 API 类型与客户端适配。
- 设计 token、图标源、信息架构和交互验收规则；各端用原生组件落实平台习惯。
- 契约 fixtures 与端到端用户旅程；学生资格、可见性、权限、评分等业务规则统一留在服务端。
- 链接协议，例如课程、教师、资料和动态的稳定 URL，映射到 App Links/Universal Links/小程序页面。

不建立包含全部业务状态机的巨大跨端 SDK，也不强迫所有平台复用同一个渲染层。生成器对 ArkTS 等目标的实际支持需先做编译验证；不支持时用小型手写传输适配器消费生成的 schema，不能宣称全部 SDK 已有可用生成器。

## 登录与小程序限制

移动端是 public client，不包含 secret。各端独立 client ID，标准 code + S256 PKCE，使用平台系统认证会话，严格校验 state/nonce/redirect。是否直接消费 Casdoor token 或由 API 建立本地 session，在首个端的认证 ADR 中确定；不同 client 的 token 不因同一 issuer 就可互换 audience。

微信 `wx.login` 返回的 code 由服务端换取 appid 下的平台身份。openid 不能直接充当 Casdoor subject；unionid 也不能在缺失条件下推断。首次用户必须显式证明已有 SSO 账号并确认绑定，新建账号规则另定；换绑/解绑有重新认证与审计。

小程序不能被假定具备普通浏览器的完整 OAuth 重定向能力。先验证已认证业务域名下的 web-view 承载或跨设备一次性绑定流程，确保满足平台能力和审核条件。小程序仅得到本应用会话，绑定凭证短时、一次性、绑定 client/device intent；不把 access token 放进 URL、二维码或 postMessage 明文流转。登录体验原型通过后再承诺无缝统一登录。

## 能力协商与离线

服务端返回模块 capability 和客户端最低兼容版本；关闭模块后所有端一致隐藏入口，深链接返回可解释状态。权限仍由后端校验。收藏与草稿可先本地保存，评价发布、课程编辑、账号绑定必须经过在线服务端确认；重试使用幂等键，避免双发。

## 构建与验收

Web、小程序及 Android 常规编译可用 GitHub 标准 Linux runner；iOS 需要 macOS + Xcode，模拟器构建与真机签名/上架分开。现有 StuHelper Linux ARC 不能承担 iOS 原生编译。HarmonyOS 的 DevEco/Hvigor/SDK、许可证、系统兼容性和签名需按官方支持的环境独立验证，必要时专用 runner。

各端依次完成登录、课程详情、教师详情、发布评价和资料下载这一条完整用户旅程，再扩展功能。签名证书、开发者账户与应用商店发布由独立受保护流水线处理。当前基础 CI 没有这些客户端构建任务。

官方参考：[Android Compose](https://developer.android.com/compose)、[SwiftUI](https://developer.apple.com/swiftui/)、[HarmonyOS](https://developer.huawei.com/consumer/cn/doc/)、[微信小程序](https://developers.weixin.qq.com/miniprogram/dev/framework/)、[RFC 8252 原生 OAuth](https://www.rfc-editor.org/rfc/rfc8252)、[PKCE](https://www.rfc-editor.org/rfc/rfc7636)。
