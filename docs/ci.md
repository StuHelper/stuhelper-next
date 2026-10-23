# CI 与 runner 切换

## 默认与可选运行方式

基础 CI 在 push 到 develop/main、PR 和手动 dispatch 时运行。默认 `ubuntu-24.04`，属于公共仓库可免费使用的 GitHub 标准托管 runner。大规格 runner、制品/缓存存储、应用商店账号等不能笼统算作免费；本仓库基础 CI 不上传 artifact。参考 [GitHub Actions 计费](https://docs.github.com/en/billing/concepts/product-billing/github-actions)。

同一套检查可以手动选用 StuHelper 自建 runner：

```bash
gh workflow run ci.yml --repo StuHelper/stuhelper-next --ref develop -f runner=stuhelper
gh workflow run ci.yml --repo StuHelper/stuhelper-next --ref develop -f runner=github
```

也可在 Actions → CI → Run workflow 中选择。手动选 StuHelper 只允许受信的 develop/main；其他分支会在托管 runner 上明确拒绝该请求。

| 事件 | runner |
| --- | --- |
| PR，包括 fork/Dependabot | 此维护版本的工作流固定走 GitHub 托管 |
| develop/main push | `CI_RUNNER=stuhelper` 才走 ARC，否则 GitHub 托管 |
| 手动 dispatch | 由 `runner=github` / `runner=stuhelper` 控制，独立于变量 |

初始化将仓库变量 `CI_RUNNER` 设为 `github`。以后需要自动切换可信分支的 CI，只修改该变量，无需改 YAML；恢复设为 `github`。

ARC 选择器使用组织组 `stuhelper-arc` 和 scale set 标签 `stuhelper-arc-sh-k8s`，不固定某个临时 Pod 名称。2026-10-23 在组织设置页面核实该组允许公共仓库、标签在线；API 返回普通 runner 列表为空不代表 ARC scale set 不存在。

两类 runner 执行完全相同的仓库检查与 actionlint。需要 Linux x86_64、Python 3.11+、Git、curl、受支持的 GitHub Actions runner runtime，能访问 GitHub release 下载；不依赖私有镜像库、生产数据库或宿主 Docker socket。

## 信任边界

工作流只授予 `contents: read`，checkout 不持久化凭据。第三方 action 固定 commit，actionlint 固定版本与下载归档 SHA-256；无 `pull_request_target` 执行 PR 代码、无生产 secret 或 SSH。

**仓库中的 if 条件不等于组织级 runner 隔离。** 2026-10-23 现有 `stuhelper-arc` 组的设置是所有仓库（含公共）和所有工作流可使用；本次未修改其他项目共用的组织设置。恶意 PR 可以修改工作流文件，因此“本文件对 PR 选用托管 runner”不能被当作“攻击者不能申请 ARC”的证明。

开放不受信贡献自动执行前，应使用限制到可信 `workflow@ref` 的专用 runner group/scale set 或私有受信调度仓库，并限制网络和凭据；组织现有共享组的调整需要单独评估其他仓库。外部贡献工作流保持 GitHub 的人工审批策略。基础 CI 的手动 ARC 验证只针对已审查的本次提交，不把它包装为公共 fork 的安全隔离验收。

## 当前检查范围

- 本地 Markdown 文件链接、Python/JSON 语法、敏感扩展名/环境文件误提交检查。
- 模块 ID、必需/可选依赖引用、必需依赖 DAG。
- 官方 Casdoor 候选锁的元数据格式；CI 不联网重新解析候选，不把上游变化混入当前提交。
- actionlint 检查 Actions YAML、表达式和工作流语义。嵌入 shell 的 shellcheck/pyflakes 不在当前 actionlint 范围内。

文件扩展名检查不是完备的 secret scanner；发布前还需审查新增内容。当前没有业务 API、前端、移动端或数据迁移测试，后续功能必须增加相应检查。不能把基础 CI 的通过写成产品验收通过。

## 发布边界

默认 develop，main 保留作生产晋级。普通变更 PR squash 到 develop；develop → main 使用 merge commit。新仓库首次引导的相同提交不产生 tag、不发镜像、不部署。

后续发布流程按服务/客户端独立版本化，固定依赖和构建环境；iOS 使用 macOS runner，HarmonyOS 使用已验证支持的 SDK 环境。业务发布与独立 SSO 更新是不同流水线。
