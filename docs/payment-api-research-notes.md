# 支付 API 调研摘录

## 微信支付 JSAPI 官方文档

来源页面：`https://pay.weixin.qq.com/doc/v3/merchant/4012791856`

已确认的关键点如下：

1. JSAPI/小程序下单核心接口为 `POST /v3/pay/transactions/jsapi`。
2. 微信支付要求商户在下单时提供 `appid`、`mchid`、`description`、`out_trade_no`、`notify_url`、`amount.total`、`payer.openid` 等核心字段。
3. 官方文档侧边栏明确给出了配套接口链路：`JSAPI调起支付`、`微信支付订单号查询订单`、`商户订单号查询订单`、`关闭订单`、`支付成功回调通知`、`退款申请`、`查询单笔退款`、`退款结果回调通知`。
4. 文档强调 `notify_url` 必须可公网访问，并且支付回调、查单、退款是同一支付闭环的组成部分。

## 支付宝官方文档线索

来源页面：`https://opendocs.alipay.com/open/1bce7243_alipay.trade.query`

当前浏览页面未直接加载出正文，但该官方入口已被搜索结果标识为“统一收单交易查询接口”，可作为后续引用与核对的官方文档入口。当前项目代码中已收录以下支付宝统一收单接口名：

1. `alipay.trade.create`
2. `alipay.trade.query`
3. `alipay.trade.refund`
4. `alipay.fund.trans.uni.transfer`

后续交付文档将以现有代码清单为基础，并结合搜索结果中的官方接口名称，输出一份面向实施的支付 API 清单。
