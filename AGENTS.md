# StuHelper Next 工程约定

先读 [README](README.md)、[文档导航](docs/README.md)和任务主题。文档分类、状态与维护方式见[文档约定](docs/authoring.md)。

## 工作区与交付

* 项目按模块分仓。仓库可见性按代码与文档的保密范围确定，完整开发工作区统一由 `mani.yaml` 管理。运行时权限由服务端独立执行。
* Git 和 Mani 使用开发者主机安装的版本。日常直接使用 Mani 命令。Go、Node.js 等项目工具链以 `architecture/toolchains.json` 为准。
* 主检出位于 `workspace/<仓库名>`，任务工作树位于 `workspace/worktrees/<任务>/<仓库名>`。大功能使用专用短期分支和独立工作树，一个主要写入者，保留其他任务的改动。
* 一个 PR 解决一个明确问题，可包含多次本地提交和批量推送。同一任务持续更新同一 PR，不要求每次提交都推送或新建 PR。跨仓改动列出依赖、合并顺序和验证组合。提交与 squash 标题使用 `type(scope): 简述`，scope 可省略。
* 每次开发先刷新 `origin/develop`，短期分支通过 PR squash 合入 develop。正式发布采用 develop 到 main 的 merge commit。tag、镜像发行和生产晋级由 owner 授权。
* 普通检查使用 GitHub `ubuntu-26.04`。Docker/OCI 与 BJ1 Registry 任务使用 StuHelper 自建 runner。runner 的操作系统升级由 owner 手动安排。规则见[runner 规格](docs/spec/ci-runners.md)。
* Actions 与部署镜像使用明确版本 tag，源码提交、digest 和 checksum 用于核验。正式部署组合由 ops 管理，工具包使用带注释的版本 tag，已发行 tag 保持不变。普通集成默认解析最新源码，候选覆盖必须明确登记。每轮源码组合写入 CI summary，`workspace.lock.json` 保存固定候选。
* CI 同时验证 develop/main push 和面向这两个分支的 PR，取消同一事件及分支或 PR 的旧运行。路径选择和最终必需检查见 [CI 规格](docs/spec/ci-runners.md)，本地 hooks 见[检查指南](docs/guide/repository-checks.md)。
* 普通检查使用锁文件和有大小限制的公开依赖缓存。PR 只恢复，可信 develop 检查成功后保存，不上传 artifact。新增存储说明用途、上限、保留期和清理方式，不自动扩大付费额度。BuildKit 缓存使用任务专属 builder 或 BJ1 Registry。
* Docker 测试使用任务专属名称、标签或 Compose project。完成、失败和中断时清理本任务的容器及闲置镜像，保留其他任务资源和持久数据。
* 本仓库任务在 Next 工作区内完成。旧 StuHelper、AI、Store 工作树及生产系统分别按对应任务处理。

## 接口、数据与国际化

* Casdoor 使用官方发行原件，通过 OIDC 和官方 API 接入。业务服务使用独立数据访问身份，保留 issuer、subject 和外部绑定。
* 新增关键行为与失败路径时增加针对性测试，并在模块清单的 `scenario_tests` 登记已实现场景及实际测试函数。
* 工具链变更先改 `architecture/toolchains.json`，再执行 `node scripts/workspace.mjs toolchains --write` 并更新 pnpm 锁文件。共享检查通过固定版本的工程工具包复用。
* 项目使用 AGPL-3.0-only，保留第三方许可证与来源。Vben 源码标识保留，产品名称使用 stuhelper-admin。
* API 先定义 OpenAPI，再生成各端 SDK。客户端快照记录提供方版本和源码提交，通过兼容性与共享行为用例验证。
* 后端采用 Handler → Service → Repository。模块拥有自己的数据与迁移，跨模块协作使用公开接口。必需依赖、可选依赖和能力依赖分别声明。
* 公共授权、审核与审计由服务端执行。模块关闭保留数据。原生客户端使用公有客户端认证方式，服务管理凭据和私钥留在服务端。
* 生产配置、凭据、身份材料、支付载荷及备份仅保存在获准的私有环境中。公开代码、日志与检查输出使用脱敏内容。
* 业务术语以[术语表](docs/spec/terminology.md)为准。应用默认中文，并完整支持语言清单中的八种语言。新增界面文案使用翻译键，复数和格式化使用公共国际化接口。
* 课程评价以选课记录确认资格，教师选项来自本人任课记录。机器人群聊查询按请求人权限直接返回，规则见[信息查询](docs/spec/information-query.md)。
* SSO 保留与迁移按[兼容规格](docs/spec/sso-compatibility.md)执行。候选首次访问生产库后，回退方案保留切换后的新写入。

## 文档与沟通

* 文档直接描述当前行为、当前实现和剩余工作。代码或规则变化时，同步替换相应文档中的旧内容，合并重复段落。历史细节由 Git、PR 和 CI 保存。
* 使用现有主题承载长期规则与实施状态。验证结果随对应主题更新，日常修复保持文档简洁。
* 使用自然、具体的现代汉语，说明对象、动作和结果。直接写出当前规则，必要的技术对比说明具体条件和边界。
* 文档正文单段最多 200 个可见字符。ADR 文件编号与标题一致，规格场景编号保持唯一。内容修改同步更新日期，检查使用提交日期判断。
* 保留准确的专业术语，并解释影响理解的概念。段落围绕一个主题，使用连接词说明因果和条件。
* 回复先给结果，再给必要证据与剩余事项。检查通过、真实账号验收、发行和部署分别报告。失败先修复并重跑原检查，再验证受影响阶段。
* 长期文档使用相关写作技能。已明确的授权直接沿用，待确认的产品选择保持 InReview。工具明确进入 Goal Mode 时减少进度沟通，其余情况按正常协作执行。
