# iCloush LAB. 支付网关预研：微信支付 V3 与支付宝 JSON API 接入说明

## 背景

当前 iCloush LAB. 的 2C 零售前台仍处于合规过渡阶段，前台主转化动作继续由 `REQUEST ALLOCATION / 申请配额` 承接。为了在 ICP、商户号、证书与密钥下发后快速切换到真实直单链路，本轮 Sprint 3 已在 `packages/payments/src/index.ts` 预埋统一的 `PaymentGatewayInterface`、`createPaymentOrder` 与 `paymentWebhookCallback` 空壳实现，并将微信支付 V3 与支付宝开放平台都纳入同一层网关抽象。

微信支付官方文档明确指出，在 **请求应答场景、接口回调场景、调起支付场景** 中，开发者都需要进行签名验签；同时，回调处理还涉及专门的回调报文解密流程。[1] 支付宝开放平台则明确区分 **同步返回验签** 与 **异步通知验签** 两类场景，并要求开发者在异步通知中去除 `sign`、`sign_type` 后再对剩余参数进行排序与 RSA 验签。[2]

## 当前网关抽象

本轮支付预埋不是“临时注释”，而是为后续真实接入预先固定边界。当前核心结构如下。

| 层级 | 当前位置 | 作用 | 当前状态 |
| --- | --- | --- | --- |
| 统一网关接口 | `packages/payments/src/index.ts` | 暴露 `PaymentGatewayInterface`、`createPaymentOrder`、`paymentWebhookCallback` | 已预埋空壳 |
| 微信通道 | `wechat_pay_v3` | 承接 JSAPI / 小程序支付、支付回调、查单与退款清单 | 已定义 required configs 与 request snapshot |
| 支付宝通道 | `alipay_openapi` | 承接统一收单、异步通知、查询与退款清单 | 已定义 required configs 与 request snapshot |
| 订单草稿桥接 | `prepareWechatPrepayDraft` | 在无密钥阶段先把订单、支付记录与待补参数关联起来 | 已可用 |
| 前台转化层 | `apps/web-b2b/src/App.tsx` | 继续通过 fallback 弹窗承接顾问式转化 | 已升级为“空间节点交易通道合规接入中”版本 |

这意味着，后续真实支付接入时不需要从页面按钮一路重新设计，只需把前端按钮指向真实下单 mutation，再将服务端 mutation 接到 `createPaymentOrder()` 的正式实现即可。

## 推荐的 Node / tRPC 落地架构

当前 Monorepo 适合采用“前台站点 → tRPC procedure → payments 包 → 第三方支付”这一条单向链路。这样做的好处在于，支付私钥、商户证书、平台证书、公钥与 APIv3 Key 都只停留在服务端，React 前台永远不直接接触敏感材料。

| 环节 | 推荐职责 | 关键说明 |
| --- | --- | --- |
| `apps/web-b2b` 前台 | 提交购买意图、展示加载态、在微信 JSAPI 场景发起调起支付 | 只接收 `prepay_id` 或调起参数，不接触私钥 |
| `apps/web-b2b/server/routers.ts` | 提供 `createRetailPaymentOrder`、`handlePaymentWebhook` 等 procedure | 保持与订单查询、库存锁定、价格校验同一事务边界 |
| `packages/payments` | 对微信/支付宝进行统一封装 | 对上暴露统一接口，对下隐藏签名差异 |
| 数据层 | 持久化 payment 记录、provider_order_id、回调事件日志 | 强制幂等，避免重复更新订单状态 |
| 定时补偿任务 | 查单、漏单修复、异常告警 | 回调丢失时必须可回补 |

在这个架构下，**真实支付永远是服务端职责，前台只是调起器**。这与当前项目的 tRPC 优先模式保持一致，也能避免后续在小程序、H5 与顾问式补单三条链路之间出现重复实现。

## 微信支付 V3：建议接入顺序

微信支付 API V3 的核心难点不是“发一个 POST 请求”，而是证书、签名、验签、回调解密与幂等落库必须同时成立。官方文档已经把这些要求前置到请求、应答、回调和调起支付的各个阶段。[1]

| 阶段 | 推荐动作 | 对应实现位置 |
| --- | --- | --- |
| 1. 商户配置 | 在 Secrets 中注入 `WECHAT_PAY_MCHID`、`WECHAT_PAY_APPID`、`WECHAT_PAY_SERIAL_NO`、`WECHAT_PAY_PRIVATE_KEY`、`WECHAT_PAY_API_V3_KEY`、`WECHAT_PAY_PLATFORM_CERT_PATH_OR_PUBLIC_KEY` | 项目 Secrets + `packages/payments` |
| 2. 下单 | 在服务端生成签名，请求 `/v3/pay/transactions/jsapi`，获取 `prepay_id` | `createPaymentOrder({ gateway: "wechat_pay_v3" })` |
| 3. 前端调起 | 服务端再生成调起支付所需参数，前台只负责调用 | `apps/web-b2b` 前台 mutation success handler |
| 4. 回调验签 | 使用 `Wechatpay-Timestamp`、`Wechatpay-Nonce`、`Wechatpay-Signature`、`Wechatpay-Serial` 验证回调来源 | `paymentWebhookCallback({ gateway: "wechat_pay_v3" })` |
| 5. 回调解密 | 对 `resource.ciphertext` 做 APIv3 解密，取出 `out_trade_no`、`transaction_id`、金额等字段 | `packages/payments` 内部 helper |
| 6. 幂等落库 | 先比对支付状态，再更新订单状态、支付记录与回调日志 | `packages/oms` / 支付日志表 |
| 7. 补偿查单 | 异常情况下调用查询接口核单 | 定时任务或后台排障入口 |

在当前项目内，推荐先把微信支付正式实现拆为三个 helper：`signWechatRequest()`、`createWechatJsapiOrder()`、`verifyAndDecryptWechatCallback()`。这样可以让 `createPaymentOrder()` 和 `paymentWebhookCallback()` 保持统一接口，而把签名与验签细节收敛到网关内部。

## 微信支付 V3：Webhook 验签与解密要点

微信支付官方文档表明，回调通知不是“拿到 JSON 就直接改订单”，而是必须先验签，再处理业务。[1] 这意味着服务端接收 `notify_url` 后，推荐遵循如下顺序。

| 顺序 | 动作 | 为什么不能省略 |
| --- | --- | --- |
| 1 | 保留原始请求体字符串 | 验签依赖原始串，不能先 JSON.parse 再重组 |
| 2 | 读取 `Wechatpay-*` 头 | 这些头部参与验签，缺失时应直接拒绝 |
| 3 | 用平台证书或微信支付公钥验签 | 确认回调来源确实来自微信支付 |
| 4 | 解密 `resource` 字段 | 微信回调中的核心订单信息通常在加密资源体内 |
| 5 | 校验商户号、金额、订单号 | 防止串单、伪造金额与回调错投 |
| 6 | 以 `out_trade_no` 或 `transaction_id` 做幂等写入 | 解决微信重试回调、多次通知问题 |
| 7 | 成功后返回官方要求的成功应答 | 让微信停止重复通知 |

在实际实现中，回调路由应该只做两件事：**验证消息真实性** 与 **记录状态变化**。任何库存解锁、短信通知、CRM 打标等后续动作，都建议挂到异步事件总线或后置 job 中，避免因为副作用失败导致支付回调超时。

## 支付宝 JSON API / 网关：建议接入顺序

支付宝开放平台的接口族比微信支付更分散，但验签规则写得很明确。官方文档指出，同步返回时只对 JSON 中的 `xxx_response` 值做验签；异步通知则必须排除 `sign`、`sign_type` 后，对剩余参数进行 `url_decode`、排序、拼接，再以 RSA 验签。[2]

| 阶段 | 推荐动作 | 对应实现位置 |
| --- | --- | --- |
| 1. 应用配置 | 在 Secrets 中注入 `ALIPAY_APP_ID`、`ALIPAY_PRIVATE_KEY`、`ALIPAY_PUBLIC_KEY`、`ALIPAY_NOTIFY_URL`、`ALIPAY_SIGN_TYPE` | 项目 Secrets + `packages/payments` |
| 2. 下单 | 根据 H5 / WAP / APP 场景选择 `alipay.trade.create`、`alipay.trade.wap.pay` 或等效接口 | `createPaymentOrder({ gateway: "alipay_openapi" })` |
| 3. 同步响应验签 | 只对 `xxx_response` 做验签，确认网关响应可信 | `packages/payments` helper |
| 4. 异步通知验签 | 取出全部通知参数，排除 `sign`、`sign_type`，排序后 RSA 验签 | `paymentWebhookCallback({ gateway: "alipay_openapi" })` |
| 5. 幂等落库 | 基于 `out_trade_no`、`trade_no`、金额、交易状态更新本地支付记录 | `packages/oms` / 支付日志表 |
| 6. 主动查单 | 回调缺失或结果冲突时主动调用查询接口补偿 | 定时任务 |

如果后续大陆主力链路仍以微信为主，那么支付宝可以先作为**同层预留通道**，共用 `PaymentGatewayInterface` 与支付状态表，不必在前台过早暴露为主按钮，但要保持数据库字段与回调日志结构已经兼容。

## 建议的 tRPC procedure 设计

为了让前台 H5、未来小程序与后台客服补单都能复用同一支付入口，建议后续新增以下过程。

| Procedure | 输入 | 输出 | 说明 |
| --- | --- | --- | --- |
| `retail.createPaymentOrder` | `orderId`、`gateway`、`channelContext` | `clientPayload`、`stage` | 统一创建支付单 |
| `retail.confirmPaymentStatus` | `orderId` | `paymentStatus`、`providerStatus` | 用于前台支付后轮询 |
| `system.paymentWebhook.wechat` | headers + rawBody | 固定应答 | 微信回调入口 |
| `system.paymentWebhook.alipay` | form/json params | 固定应答 | 支付宝回调入口 |

这几条 procedure 的共同原则是：**输入尽量业务化，签名细节全部内聚在 payments 包**。这样后续如果从 JSAPI 转为小程序支付，变更只发生在 `packages/payments` 内部，不需要前台页面大面积重构。

## 安全与运维要求

支付接入一旦开启，项目的安全边界必须同步提升。结合官方要求与当前项目现状，推荐执行下列约束。

| 主题 | 推荐策略 |
| --- | --- |
| 密钥管理 | 所有支付证书、私钥、公钥与 API Key 一律只通过项目 Secrets 管理，不落库、不入仓库 |
| 原始报文 | 微信与支付宝回调都必须保留原始 body/参数串，便于验签与审计 |
| 幂等 | 按 `out_trade_no`、`trade_no`、`transaction_id` 做唯一约束或逻辑幂等 |
| 日志 | 记录请求时间、回调时间、验签结果、provider order id、金额比对结果，但避免打印完整敏感证书内容 |
| 补偿 | 任何回调异常都要进入待补偿队列，由查单任务兜底 |
| 退款 | 退款接口不应和支付成功写入共用同一个无状态 helper，应单独记录退款单与退款回调 |

## 当前 Sprint 3 已完成的预埋边界

本轮已经完成的部分，决定了后续接入可以在较小改动下完成。

| 已完成项 | 说明 |
| --- | --- |
| `PaymentGatewayInterface` | 已统一抽象微信与支付宝两个网关 |
| `createPaymentOrder` 空壳 | 已返回 `requiredConfigs` 与 `requestSnapshot`，便于接入前自检 |
| `paymentWebhookCallback` 空壳 | 已区分微信/支付宝两种回调，保留后续正式验签入口 |
| API inventory | 已梳理微信支付 V3 与支付宝常用 create/query/callback/refund/transfer 端点 |
| 前台 fallback | 在真实支付未开放前，继续由企业微信顾问与小程序预留节点承接流量 |

因此，后续的真实支付接入工作更像“把证书和签名填进既有接口”，而不是重新发明一套支付体系。

## 下一步实施顺序

建议在 ICP、商户号与密钥到位后，按下表推进，而不是同时并行改造所有环节。

| 优先级 | 动作 | 完成标准 |
| --- | --- | --- |
| P0 | 注入微信支付与支付宝 Secrets | 通过服务端启动校验 |
| P0 | 实现微信 `createPaymentOrder` 正式下单 | 能返回 `prepay_id` 或等效调起参数 |
| P0 | 实现微信回调验签与解密 | 沙箱或测试环境能正确落库 |
| P1 | 接入前台支付后轮询与成功页 | 订单状态能在前台可见 |
| P1 | 实现支付宝创建订单与异步通知 | 形成双通道路由兼容 |
| P2 | 接入查单补偿、退款、运维告警 | 构成完整支付闭环 |

## References

[1]: https://pay.weixin.qq.com/doc/v3/merchant/4012365342 "总述-APIv3如何签名和验签_通用规则 | 微信支付商户文档中心"
[2]: https://opendocs.alipay.com/common/02mse7 "自行实现验签 | 支付宝文档中心"
