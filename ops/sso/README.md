# SSO 独立运维包起点

当前交付是候选元数据解析器，不是部署器。不会访问生产数据库、SSH、Docker socket、现有应用配置或真实用户。

```bash
python3 ops/sso/resolve_candidate.py --version v4.23.0
```

省略 `--version` 时查询 GitHub 最新稳定 release；如果已经跨到其他主版本，会拒绝并要求显式选择 v4。输出官方 tag、解析后的 commit、Docker Hub 镜像 index digest 和 Linux 平台 digest。只发出公开元数据查询，不下载镜像层或运行 Casdoor。

`candidate.json` 是已经实际解析的候选锁，状态固定为 `candidate-not-deployed`。digest 校验只能证明读取到的 registry 内容一致，不能代替独立来源证明、漏洞评估、迁移演练、消费资格或生产批准。GitHub tag 与同名镜像之间的构建来源交叉验证属于后续资格工具；不能仅凭名称一致声称已证明镜像由该 commit 构建。

不在公共仓库保存 app.conf、初始化真实数据、数据库/Redis 连接信息或密钥。后续完整独立部署包从受控主机配置/secret backend 获得这些信息，不从 StuHelper 主站 API 获取。

首次切换与一键更新的状态机、数据边界和验收详见 [SSO 迁移设计](../../docs/sso-migration.md)。
