---
type: guide
status: Accepted
updated: 2026-10-24
---

# 工具链与依赖维护

## 版本来源

Go、Node.js、uv、pnpm 和 actionlint 的项目版本维护在 `architecture/toolchains.json`。`.node-version`、`.go-version`、Go 模块和包管理器的引擎声明由工作区命令同步，CI 从版本文件读取 Go 与 Node.js。Mani 和 Git 是主机工具，开发者自行安装；集成 CI 使用已验证的 Mani 发行版本。

## 常规依赖

各仓库的 Dependabot 覆盖其实际使用的 pnpm、Go、uv 和 GitHub Actions，每周提出版本更新。兼容补丁和次版本可以归组，主版本分别评估。依赖修改经过锁文件、独立检查与集成组合验证后合入。

安全更新依赖 GitHub 的依赖图、Dependabot alerts 和 security updates 设置。仓库配置进入维护分支后核对这些设置及首次更新结果。新的运行时 LTS 由维护者评估兼容性后统一采用。

Renovate 适合需要共享更新预设、更多版本文件识别和集中更新策略的阶段。采用时统一切换更新机器人，保留现有检查与人工合并流程。任何机器人都需要跨仓版本组合验证。

## 统一升级

在同一任务的模块工作树中修改版本清单，然后同步版本文件：

```bash
node scripts/workspace.mjs toolchains --write
```

版本清单属于共享工程工具包。修改工具、模块声明、术语或语言规则后，先在架构仓库运行共享工具测试并提交、推送源码，然后将各消费者指向该提交：

```bash
pnpm run test:tools
node scripts/workspace.mjs tooling FULL_COMMIT_SHA --write
mani exec --all 'pnpm install'
mani run check --all
node scripts/workspace.mjs toolchains
node scripts/workspace.mjs contracts
pnpm run test:e2e
```

`FULL_COMMIT_SHA` 使用刚推送的完整提交号。该命令更新八个消费者的 Git 依赖和 `workspace.lock.json` 中的工具版本。版本检查同时核对工具包源码与各仓库的依赖声明。共享工具只维护一份，pnpm 从公共 Git 仓库安装，私有模块的内容不进入工具包。

首次升级时使用 `pnpm install` 更新各仓库锁文件，之后 `make setup` 与 CI 使用 `--frozen-lockfile`。代码仓库通过检查并提交、推送后，用 `snapshot --write` 更新联调组合，再提交架构仓库的组合记录。根仓库的组合记录没有打入工具包，因此不会产生相互引用的版本循环。

新的 CVE 先确认受影响版本、调用路径和修复版本，再升级相应依赖及受影响阶段。共享工具的安全依赖覆盖规则也由工作区命令同步到消费者的 pnpm 配置。

## Web 脚手架

新建 Vue 应用优先使用官方 `create-vue`。现有 Web 最初按 Vue、Vite 和 TypeScript 的最小配置建立，本次按 `create-vue` 3.24.0 的实际模板复核，采用官方 `@vue/tsconfig`、`@vue/eslint-config-typescript` 和 Node 24 配置。产品路由、接口和国际化代码继续由应用维护。

脚手架适合生成初始结构，升级时仍需要核对依赖的兼容范围。本项目保留已验证的 Vue Router 4 与 TypeScript 5.9 组合，后续主版本升级独立验证。官方说明见 [Vue 快速上手](https://vuejs.org/guide/quick-start)和[工具链指南](https://vuejs.org/guide/scaling-up/tooling)。

## stuhelper-admin 框架升级

上游来源由 `vendor/vben.json` 的 tag、提交和许可证记录。升级时比较该基线、当前应用与新上游，保留 StuHelper 的接口、语言、依赖及工作流设置。重点核对本地国际化、RTL、工具链和框架接入的差异，更新来源记录后执行完整检查及八语言页面验证。

Vben 作为框架来源保留自己的标识和许可证，产品名称使用 stuhelper-admin。
