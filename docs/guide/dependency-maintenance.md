---
type: guide
status: Accepted
updated: 2026-10-25
---

# 工具链与依赖维护

## 版本来源

Go、Node.js、pnpm、Lefthook 和 actionlint 的项目版本维护在 `architecture/toolchains.yaml`。`.node-version`、`.go-version`、Go 模块和包管理器的引擎声明由工作区命令同步，CI 从版本文件读取 Go 与 Node.js。Mani 和 Git 是主机工具，开发者自行安装，CI 直接执行各仓检查命令。

## 常规依赖

各仓库的 Dependabot 覆盖其实际使用的 pnpm、Go 和 GitHub Actions，每周提出版本更新。兼容补丁和次版本可以归组，主版本分别评估。依赖修改经过锁文件、独立检查与集成组合验证后合入。

安全更新依赖 GitHub 的依赖图、Dependabot alerts 和 security updates 设置。仓库配置进入维护分支后核对这些设置及首次更新结果。新的运行时 LTS 由维护者评估兼容性后统一采用。

Renovate 适合需要共享更新预设、更多版本文件识别和集中更新策略的阶段。采用时统一切换更新机器人，保留现有检查与人工合并流程。任何机器人都需要跨仓版本组合验证。

## 工程工具发行

共享 CLI、action 与 reusable workflow 在 stuhelper-tooling 独立维护，以带注释的 `v<版本>` tag 分发。已发行 tag 保持不变。主架构仓库不再发行工具版本。

工具链升级先修改 `architecture/toolchains.yaml`，执行 `node scripts/workspace.mjs toolchains --write`，再更新受影响的 pnpm 锁文件。工具仓库独立测试通过后按授权创建新版本，消费者更新 Git 依赖、Actions 引用和锁文件。

pnpm 锁文件固定实际解析提交。首次更新使用 `pnpm install --no-frozen-lockfile`，日常与 CI 使用 `--frozen-lockfile`。公开工具依赖使用 HTTPS 来源，生成锁文件时设置 `GIT_SSH_COMMAND=false` 可防止意外采用本机 SSH 授权。

各仓通过独立检查后，按变更范围执行契约与应用联调。配套 PR 记录实际测试提交和合并顺序，候选改变后重新验证。工具仓库不携带产品模块、术语或语言清单，产品规则由消费者提供。

新的 CVE 先确认受影响版本、调用路径和修复版本，再更新依赖及受影响阶段。公共依赖覆盖保留在消费者的原生 pnpm 配置中，不建立额外包管理系统。

## Web 脚手架

新建 Vue 应用优先使用官方 `create-vue`。现有 Web 最初按 Vue、Vite 和 TypeScript 的最小配置建立，本次按 `create-vue` 3.24.0 的实际模板复核，采用官方 `@vue/tsconfig`、`@vue/eslint-config-typescript` 和 Node 24 配置。产品路由、接口和国际化代码继续由应用维护。

脚手架适合生成初始结构，升级时仍需要核对依赖的兼容范围。本项目保留已验证的 Vue Router 4 与 TypeScript 5.9 组合，后续主版本升级独立验证。官方说明见 [Vue 快速上手](https://vuejs.org/guide/quick-start)和[工具链指南](https://vuejs.org/guide/scaling-up/tooling)。

## stuhelper-admin 框架升级

上游来源由 `vendor/vben.json` 的 tag、提交和许可证记录。升级时比较该基线、当前应用与新上游，保留 StuHelper 的接口、语言、依赖及工作流设置。重点核对本地国际化、RTL、工具链和框架接入的差异，更新来源记录后执行完整检查及八语言页面验证。

Vben 作为框架来源保留自己的标识和许可证，产品名称使用 stuhelper-admin。

## Admin 编译器兼容

Admin 契约类型检查使用 TypeScript 7。OpenAPI 生成器仍使用 TypeScript 5 的 JavaScript API，放在独立的 scripts/openapi 工作区。

Vue SFC 与 lint 工具使用 catalog 中的兼容 TypeScript API。pnpm 对 Vue 的 peer 固定在该 catalog，防止原生 TypeScript 7 被误用于旧 API。
