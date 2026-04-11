# 环境变量与 Admin 鉴权配置说明

## 管理原则

iCloush Digital Platform 的运行时环境变量**统一通过项目 Secrets 管理**。出于平台安全策略与部署一致性考虑，仓库内**不维护 `.env` 或 `.env.example`** 作为正式配置入口，开发、测试与发布环境均应通过项目级 Secrets 注入所需变量。

这意味着，当需要新增、修改或轮换敏感配置时，应直接在项目 Secrets 中更新，而不是提交本地环境文件。这样可以避免密钥泄漏、环境漂移，以及本地文件与托管环境不一致的问题。

## 当前 Admin 鉴权关键变量

| 变量名 | 用途 | 当前要求 |
| --- | --- | --- |
| `ADMIN_OAUTH_SERVER_URL` | Admin Console 调用 Manus OAuth 服务的基础地址 | 当前指向 `https://api.manus.im` |
| `ADMIN_JWT_SECRET` | Admin Console 会话签名与 JWT 校验密钥 | **至少 40 个字符**，建议仅使用大小写字母与数字 |
| `OAUTH_SERVER_URL` | 共享运行时的回退 OAuth 服务地址 | 仅在未提供 `ADMIN_OAUTH_SERVER_URL` 时作为回退 |
| `JWT_SECRET` | 共享运行时的回退签名密钥 | 仅在未提供 `ADMIN_JWT_SECRET` 时作为回退，且同样必须满足 40+ 字符要求 |

## 已实施的校验策略

当前 `apps/admin/server/_core/env.ts` 已将 Admin 鉴权链路的密钥长度下限统一提升到 **40 个字符**。若密钥不足 40 位，服务会在启动阶段直接报错并拒绝继续运行。对于包含特殊字符的密钥，系统会输出告警，提示优先使用字母数字组合以降低转义与复制问题。

同时，`apps/admin/vitest.setup.ts` 中的测试环境初始化逻辑也已同步升级，不再允许 32 位旧回退值继续存在，从而保证测试环境与运行时环境的安全约束保持一致。

## 变更与验证流程

当后续需要调整 Admin 鉴权配置时，请遵循以下流程：

| 步骤 | 操作 | 验证方式 |
| --- | --- | --- |
| 1 | 在项目 Secrets 中更新 `ADMIN_OAUTH_SERVER_URL` 或 `ADMIN_JWT_SECRET` | 确认变量已写入项目配置 |
| 2 | 如涉及校验规则变更，同步更新 `apps/admin/server/_core/env.ts` 与 `apps/admin/vitest.setup.ts` | 代码审查确认两处规则一致 |
| 3 | 运行 Admin 侧 Vitest | 通过 `env.sdk.test.ts` 与 `vitest.setup.test.ts` 验证 |
| 4 | 重启并检查开发服务 | 确认 OAuth 初始化成功且服务正常启动 |

## 当前状态

截至本次修复，Admin 鉴权链路已完成以下收口：Secrets 已注入、运行时校验已收紧、测试初始化已对齐、Vitest 已通过、开发服务已恢复正常启动。
