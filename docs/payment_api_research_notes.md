# 支付 API 调研笔记

## 已确认的官方文档与结论

### 微信支付 JSAPI 开发指引
- 来源：<https://pay.weixin.qq.com/doc/v3/merchant/4012791870>
- 已确认 JSAPI 主链路包含：`JSAPI/小程序下单` → 前端通过 `WeixinJSBridge` 调起支付 → 用户返回前端后服务端调用 `查询订单 API` 确认状态 → 微信服务端发送 `支付成功回调` → 对账 → 如需售后则调用 `退款接口`。
- 已确认关键参数包括：`openid`、`time_expire`、`prepay_id`。
- 已确认前置条件包括：商户平台配置 `JSAPI 支付授权目录`。
- 已确认订单关闭与退款相关 API：`关闭订单 API`、`申请退款接口`、`查询退款单接口`。

### 支付宝手机网站支付快速接入页
- 来源：<https://opendocs.alipay.com/open/203/105285>
- 当前页面在浏览器提取结果中过于简略，未直接暴露完整章节内容。
- 下一步应改查支付宝具体 API 文档页，例如 `alipay.trade.wap.pay`、`alipay.trade.query`、`alipay.trade.refund`、`alipay.trade.fastpay.refund.query`、异步通知与签名验签文档。

## 第二轮浏览补充

### 微信退款申请接口补充
来源：<https://pay.weixin.qq.com/doc/v3/merchant/4012791862>

微信退款申请接口为 `POST /v3/refund/domestic/refunds`。当前已确认的核心请求字段包括 `transaction_id` 或 `out_trade_no`、`out_refund_no`、`reason`、`notify_url`、`funds_account` 以及 `amount.refund`、`amount.total`、`amount.currency`。文档还给出了可选的 `goods_detail` 结构，用于按商品维度说明退款项目。

从官方说明可确认三类重要约束。第一，支付成功后一年的订单才可通过该接口发起退款。第二，单笔订单最多支持 50 次部分退款，若多次部分退款需更换商户退款单号且至少间隔 1 分钟再次调用。第三，退款申请成功仅代表退款单已受理，最终退款结果需要结合退款结果通知与查询退款接口确认。

### 支付宝文档抓取情况补充
来源：<https://opendocs.alipay.com/open/270/105902>

支付宝开放平台当前页面在浏览器提取结果中仍未完整展开正文，仅能确认该地址对应异步通知说明主题。后续应优先通过搜索结果与可直接访问的具体接口文档，整理 `alipay.trade.wap.pay`、`alipay.trade.query`、`alipay.trade.close`、`alipay.trade.refund`、`alipay.trade.fastpay.refund.query` 以及签名验签相关规范。

## 第三轮浏览补充

本轮继续尝试访问支付宝异步通知说明与手机网站支付接入流程页面，但浏览器提取结果仍然受到页面渲染方式限制，正文未能完整展开。尽管如此，结合搜索结果与页面标题，仍可确认当前需要围绕以下官方能力整理接入清单：`alipay.trade.wap.pay` 负责手机网站支付下单，`alipay.trade.query` 用于支付后查单确认，`alipay.trade.close` 用于未支付订单关闭，`alipay.trade.refund` 用于退款申请，`alipay.trade.fastpay.refund.query` 用于退款状态查询，同时必须纳入 `notify_url` 异步通知处理与 `RSA2` 验签。

由于支付宝文档站在当前环境下对正文提取不稳定，后续整理正式 API 清单时应以可检索到的官方搜索结果标题、支持中心流程说明以及接口命名一致性为基础，再将关键字段与回调约束写入平台接入基线文档。
