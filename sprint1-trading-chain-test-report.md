# Sprint 1 核心交易链路测试报告

## 一、范围说明

本轮交付在**暂缓微信支付与支付宝 JSAPI 真实 API 接入**的前提下，完成了 Sprint 1 交易主链路中不依赖真实商户密钥的部分。实现范围覆盖 `packages/pim`、`packages/oms`、`packages/payments` 与 `apps/api-gateway` 四个层次，重点验证多租户识别、阶梯定价、订单创建、微信预下单草稿生成、对公转账凭证流转，以及基于租户上下文的受保护路由拦截。

从代码结构上看，`apps/api-gateway/src/gateway.ts` 中的 `tenantProcedure` 负责强制校验租户上下文，`connectedDbProcedure` 负责补充数据库连接校验；`packages/oms/src/index.ts` 负责订单创建与对公转账审核状态迁移；`packages/payments/src/index.ts` 负责微信预下单草稿、线下转账凭证提交以及支付 API 清单；`packages/pim/src/index.ts` 负责 B2B/B2C 商品定价与阶梯价匹配。

## 二、已完成的核心能力

| 模块 | 已完成能力 | 当前状态 |
| --- | --- | --- |
| `packages/pim` | 阶梯定价解析、按客户类型匹配价格、订单项定价复用 | 已完成 |
| `packages/oms` | 创建订单、落库支付记录、对公转账审核通过/驳回状态流转 | 已完成 |
| `packages/payments` | 微信预下单草稿、对公转账凭证提交、支付 API inventory 输出 | 已完成 |
| `apps/api-gateway` | 租户上下文识别、受保护路由拦截、商品列表、下单、微信草稿、线下转账凭证、支付 API 清单 | 已完成 |
| 微信/支付宝真实支付通道 | 商户参数签名、平台证书、异步回调验签、真实下单调用 | **暂缓** |

## 三、测试命令与结果

本轮实际执行了两类验证：一类是 API Gateway 的 Vitest 测试，另一类是 API Gateway 工作区的 TypeScript 类型检查。两项验证均已通过。

| 验证类型 | 执行命令 | 结果 |
| --- | --- | --- |
| 单元/集成测试 | `cd /home/ubuntu/icloush-digital-platform/apps/api-gateway && pnpm test` | 通过，`1` 个测试文件、`9` 个测试用例全部通过 |
| 类型检查 | `cd /home/ubuntu/icloush-digital-platform/apps/api-gateway && pnpm exec tsc --noEmit -p tsconfig.json` | 通过，无 TypeScript 错误 |

## 四、Vitest 覆盖点

当前 `apps/api-gateway/tests/gateway.test.ts` 已覆盖如下九项关键断言。由于本轮目标是先打通非敏感交易链路，因此测试重点落在**领域逻辑正确性**与**租户拦截正确性**，而不是第三方支付网关联网调用。

| 用例编号 | 覆盖点 | 断言目标 |
| --- | --- | --- |
| 1 | 显式 `brandId` 解析 | 识别 `x-brand-id`、`brand_id`，过滤非法租户值 |
| 2 | Host 标准化 | 兼容 `x-forwarded-host`、协议前缀与端口 |
| 3 | 租户拦截器 | 当 `tenant` 为空时，`tenant.resolve` 与 `payments.apiInventory` 被统一拦截 |
| 4 | B2B 阶梯价匹配 | 按数量命中正确价格区间 |
| 5 | B2C 基础价回退 | 无匹配阶梯价时回退到基础价格 |
| 6 | 微信预下单草稿 | 输出分期/信用卡能力标记、付款人 OpenID、所需 API 列表 |
| 7 | 支付 API 清单 | 同时输出微信支付与支付宝 API inventory |
| 8 | 订单状态迁移 | `pending_payment -> under_review` 合法 |
| 9 | 非法状态迁移 | 阻止 `completed -> paid` 等不合法回退 |

## 五、支付 API 清单

本节整理的是**后续真实联调时需要准备的接口清单**。当前代码已将这份清单沉淀为可读取的 inventory 数据，供 API Gateway 直接返回给前端或联调文档页面。

### 5.1 微信支付

| 能力 | 阶段 | 方法 | 接口 | 是否必需 | 说明 |
| --- | --- | --- | --- | --- | --- |
| JSAPI 下单 | create | `POST` | `/v3/pay/transactions/jsapi` | 是 | 创建预支付交易单，获取 `prepay_id` |
| 支付结果通知 | callback | `POST` | 商户自定义 `notify_url` | 是 | 接收异步通知并验签，更新订单/支付状态 |
| 订单查询 | query | `GET` | `/v3/pay/transactions/out-trade-no/{out_trade_no}` | 是 | 回调缺失或补偿任务主动核单 |
| 退款申请 | refund | `POST` | `/v3/refund/domestic/refunds` | 否 | 售后退款场景 |
| 退款通知 | callback | `POST` | 商户自定义 `refund_notify_url` | 否 | 退款异步结果通知 |
| 商家转账 | transfer | `POST` | `/v3/transfer/batches` | 否 | 未来主动打款、返利或佣金结算 |

### 5.2 支付宝

| 能力 | 阶段 | 方法 | 接口 | 是否必需 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 统一收单创建交易 | create | `POST` | `/gateway.do?method=alipay.trade.create` | 是 | 创建支付宝交易单 |
| 支付结果通知 | callback | `POST` | 商户自定义 `notify_url` | 是 | 接收支付成功通知并验签 |
| 订单查询 | query | `POST` | `/gateway.do?method=alipay.trade.query` | 是 | 回调缺失时主动核单 |
| 退款申请 | refund | `POST` | `/gateway.do?method=alipay.trade.refund` | 否 | 售后退款 |
| 单笔转账 | transfer | `POST` | `/gateway.do?method=alipay.fund.trans.uni.transfer` | 否 | 企业付款或返佣 |

## 六、后续真实联调仍需准备的参数

当前系统已经具备“草稿生成 + 路由占位 + API inventory 输出”能力，但在接入真实支付前，仍需准备商户配置。为了便于后续分工，建议把准备项划分为微信支付、支付宝支付与通用回调配置三组。

| 类别 | 关键参数 |
| --- | --- |
| 微信支付 | `APP_ID`、`MCH_ID`、商户 API 证书、商户 API v3 密钥、平台证书序列号、回调地址、付款人 OpenID 来源 |
| 支付宝 | `APP_ID`、应用私钥、支付宝公钥、网关地址、签名算法、回调地址、买家标识来源 |
| 通用能力 | 订单号幂等规则、支付回调验签服务、订单补偿查询任务、退款状态同步策略、监控告警 |

## 七、当前结论

本轮 Sprint 1 的非敏感交易链路已经可用于继续并行开发前端下单流程、后台审核页面和联调文档页。也就是说，业务侧已经可以围绕**租户识别、商品定价、订单创建、线下打款审核与支付能力展示**继续推进，而不必阻塞在真实支付商户参数尚未准备完成这一点上。

同时需要说明的是，当前的微信与支付宝能力仍处于**占位草稿 / inventory 输出**阶段，并未实际发起第三方收单请求。因此，若下一阶段要进入联调，就需要优先补齐商户密钥、签名、回调公网地址和补偿查询任务，然后再把 `prepareWechatPrepayDraft` 与支付宝占位逻辑替换为真实调用实现。
