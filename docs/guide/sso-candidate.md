---
type: guide
status: Accepted
updated: 2026-10-24
---

# 解析官方 Casdoor 候选

## 范围与前置条件

使用已有 `ops/sso/resolve_candidate.py` 查询公开元数据，需要 Python 3.11+，可访问 GitHub API 与 Docker Hub。操作不读取生产配置、SSH 或 Docker socket，不下载镜像层，也不部署服务。

## 操作步骤

在仓库根目录运行精确版本查询：

```bash
python3 ops/sso/resolve_candidate.py --version v4.23.0
```

省略 `--version` 时查询官方最新稳定 release；只有 v4 被接受，若最新 release 跨到其他主版本则要求显式指定版本。`--version latest` 和预发布/非 v4 值都不是合法的精确版本。

输出包含 release URL、tag、解析后的 commit、Docker Hub image index digest 和 Linux 平台 digest。公开拉取 token 只留在进程内存，不输出。更新候选记录时先审查差异，再通过普通 PR 保存 `ops/sso/candidate.json`；解析失败不得覆盖有效候选记录。

## 结果检查与限制

状态应为 `candidate-not-deployed`，版本应为精确稳定 v4，manifest digest 已对响应内容校验。现有记录的核查日期与完整身份见[迁移记录](../development/sso-migration.md)。

还需要核实 tag 与镜像构建的对应关系，并分别完成来源、兼容性和数据演练检查。正式采用前按[SSO 规格](../spec/sso-compatibility.md)验证。

网络或上游限流导致失败时保留原候选记录，修复环境后重试；不要改用 mutable latest 镜像启动生产。后续向 BJ1 Registry 复制镜像使用自建 runner，遵循[镜像任务规则](../spec/ci-runners.md)，Casdoor 本身不重新构建。
