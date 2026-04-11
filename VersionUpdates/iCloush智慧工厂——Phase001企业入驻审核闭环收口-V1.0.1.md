# iCloush智慧工厂——Phase001企业入驻审核闭环收口-V1.0.1

## 本次更新概述

本次补丁聚焦 **P1 企业入驻申请与审核闭环** 的收口工作，目标是在不新增数据库表的前提下，复用现有 `users`、`brandMemberships` 与 `leads` 三类核心结构，完成“申请提交—待审核—审核通过/驳回—前后台状态联动”的最小可运营闭环。

## 字段盘点结论

| 数据结构 | 复用字段 | 在本轮闭环中的职责 | 本轮补充/约定 |
| --- | --- | --- | --- |
| `users` | `id`、`name`、`mobile`、`email`、`accountType`、`status` | 作为申请人主身份档案，审核通过后承载企业账户身份 | 审核通过时将 `accountType` 置为 `enterprise` |
| `brandMemberships` | `id`、`brandId`、`userId`、`memberType`、`enterpriseName`、`contactName`、`status`、`priceLevel` | 作为企业入驻申请主记录，同时承担品牌归属与审核结果沉淀 | 本轮约定 `status` 采用 `pending → approved / rejected`，审核通过且未配置价格等级时写入 `tier_pending_assignment` 占位值 |
| `leads` | `id`、`brandId`、`companyName`、`contactName`、`mobile`、`email`、`message`、`leadStatus` | 作为站点侧可追踪线索，承接申请来源、审核结论与备注说明 | 本轮约定审核通过映射为 `qualified`，驳回映射为 `invalid`，并将审核说明回写到 `message` |

## 状态流转方案

| 场景 | `brandMemberships.status` | `users.accountType` | `leads.leadStatus` | 说明 |
| --- | --- | --- | --- | --- |
| 提交企业入驻申请 | `pending` | `personal` | `new` | 形成待审核会员记录与原始线索 |
| 审核通过 | `approved` | `enterprise` | `qualified` | 完成企业身份确认，并为后续价格体系配置保留占位 |
| 审核驳回 | `rejected` | 保持原值 | `invalid` | 保留申请轨迹，同时阻断后续企业权益 |

## 服务端落地说明

本轮收口在管理端服务端中补充了两项约定。其一，审核动作会直接更新 `brandMemberships.priceLevel`：若审批通过而记录尚未配置价格等级，则自动写入 `tier_pending_assignment`，以保证后台列表和后续报价流程都能识别“已通过但待配置阶梯价”的状态。其二，审核动作的返回结果中同步携带 `priceLevel`，便于前端在客户管理页立即展示审核后状态，而不必等待额外的手工刷新解释。

## 前后台联动预期

后台客户管理页应直接消费客户快照中的 `priceLevel` 与 `status` 字段，向运营人员展示“待审核 / 已通过 / 已驳回”与“待配置阶梯价”等占位信息。前台客户中心则继续围绕申请状态卡片展示申请进度，形成同一申请记录在前后台的统一解释口径。

## 后续建议

下一步建议将 `tier_pending_assignment` 与真实价格梯度配置能力联动，在后台补充价格等级枚举维护、SKU 阶梯价绑定与审核通过后的推荐默认档位策略，从而把当前占位态扩展为真正可执行的 B2B 报价能力。
