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

## 工程工具发行

共享工具通过 `tooling-v<版本>` 这样的带注释 tag 分发。包声明使用明确版本，pnpm 锁文件保存解析后的提交及安装元数据。已发行 tag 不覆盖、不移动、不删除。发行前确认 owner 授权，先完成候选源码与工作流检查，再创建并推送 tag。

升级工具链或共享规则时，修改 `architecture/toolchains.json` 和工具包的 `package.json` 版本，然后执行 `toolchains --write` 同步版本文件及可复用工作流引用。提交候选后，为该提交创建新工具版本 tag。

发行 tag 可访问后，在完整工作区更新消费者：

```bash
node scripts/workspace.mjs tooling 0.1.2 --write --remote
mani exec --all 'GIT_SSH_COMMAND=false pnpm install'
mani run check --all
node scripts/workspace.mjs toolchains --remote
node scripts/workspace.mjs contracts
pnpm run test:e2e
```

示例版本替换为本次发行版本。更新命令同步八个消费者的版本声明，并将 tag 解析出的 SHA 写入架构记录。各消费者独立检查远端 tag 与 pnpm 锁文件一致性，接受 HTTPS Git 或 GitHub 归档。依赖安装与完整性由 pnpm 校验，锁文件中的完整性字段按 pnpm 生成结果保留。tag 缺失或内容改变时，检查失败。

pnpm 10 在网络探测失败时可能记录本机可用的 SSH 来源。生成公共工具锁文件时临时关闭 SSH，避免依赖开发者私钥；CI 拒绝 SSH 来源，安装使用已锁定的 HTTPS 来源。

工具初次提交时，架构记录可只包含版本名，避免提交引用自身。tag 建立后补记解析出的 SHA，消费者锁文件固定相同 SHA。包源码不包含工作区组合记录。

首次更新使用 `pnpm install` 写入锁文件，日常安装与 CI 使用 `--frozen-lockfile`。应用源码变更通常使用最新组合检查。配套 PR 通过候选配置参与联调，精确重放方法见[开发工作区](development-workspace.md)。

新的 CVE 先确认受影响版本、调用路径和修复版本，再升级相应依赖及受影响阶段。共享工具的安全依赖覆盖规则由工作区命令同步到消费者的 pnpm 配置。

## Web 脚手架

新建 Vue 应用优先使用官方 `create-vue`。现有 Web 最初按 Vue、Vite 和 TypeScript 的最小配置建立，本次按 `create-vue` 3.24.0 的实际模板复核，采用官方 `@vue/tsconfig`、`@vue/eslint-config-typescript` 和 Node 24 配置。产品路由、接口和国际化代码继续由应用维护。

脚手架适合生成初始结构，升级时仍需要核对依赖的兼容范围。本项目保留已验证的 Vue Router 4 与 TypeScript 5.9 组合，后续主版本升级独立验证。官方说明见 [Vue 快速上手](https://vuejs.org/guide/quick-start)和[工具链指南](https://vuejs.org/guide/scaling-up/tooling)。

## stuhelper-admin 框架升级

上游来源由 `vendor/vben.json` 的 tag、提交和许可证记录。升级时比较该基线、当前应用与新上游，保留 StuHelper 的接口、语言、依赖及工作流设置。重点核对本地国际化、RTL、工具链和框架接入的差异，更新来源记录后执行完整检查及八语言页面验证。

Vben 作为框架来源保留自己的标识和许可证，产品名称使用 stuhelper-admin。
