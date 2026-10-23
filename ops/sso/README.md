# SSO 独立运维包起点

当前提供官方候选版本的元数据解析工具，查询 GitHub 和 Docker Hub 的公开信息。部署与数据迁移工具仍待实现。

```bash
python3 ops/sso/resolve_candidate.py --version v4.23.0
```

省略 `--version` 时查询 GitHub 最新稳定 release；如果已经跨到其他主版本，会拒绝并要求显式选择 v4。输出官方 tag、解析后的 commit、Docker Hub 镜像 index digest 和 Linux 平台 digest。只发出公开元数据查询，不下载镜像层或运行 Casdoor。

`candidate.json` 保存已经解析的版本、提交和镜像 digest，状态为 `candidate-not-deployed`。digest 校验用于确认 registry 返回的内容。后续还需要核实 GitHub tag 与镜像的构建来源，并完成漏洞评估、迁移演练、接入应用兼容测试和生产批准。

不在公共仓库保存 app.conf、初始化真实数据、数据库/Redis 连接信息或密钥。后续完整独立部署包从限制访问的主机配置或密钥存储服务（secret backend）获得这些信息，不从 StuHelper 主站 API 获取。

操作方法见[候选解析指南](../../docs/guide/sso-candidate.md)。首次切换与一键更新的机制见[独立 SSO 设计](../../docs/design/independent-sso.md)，数据与验收要求见[兼容规格](../../docs/spec/sso-compatibility.md)，进度见[迁移工作](../../docs/development/sso-migration.md)。

官方镜像路线已确认。本项目不构建或重新打包 Casdoor；需要向 BJ1 Registry 原样复制镜像时使用 StuHelper 自建 runner，保持 digest 一致。
