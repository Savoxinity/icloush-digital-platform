# 微信小程序 WebView 承载研究笔记

## 已核对的官方文档

### 1. 业务域名
- 来源：https://developers.weixin.qq.com/miniprogram/dev/framework/ability/domain.html
- 关键信息：小程序内嵌网页依赖业务域名配置；小游戏与个人类型小程序暂不支持；需在小程序管理后台配置业务域名；当前 H5 页面承载能力依赖 `web-view`。

### 2. web-view 组件
- 来源：https://developers.weixin.qq.com/miniprogram/dev/component/web-view.html
- 关键信息：
  - `web-view` 是承载网页的容器，会自动铺满整个小程序页面。
  - 个人类型小程序暂不支持 `web-view`。
  - `src` 若不是关联公众号文章，则需要在小程序管理后台配置业务域名。
  - H5 可通过 `wx.miniProgram.getEnv`、`window.__wxjs_environment`、UA 中 `miniProgram` 字样判断自己是否运行在小程序 WebView 环境。
  - H5 可通过 `wx.miniProgram.postMessage` 与小程序通信，但触发时机受限于后退、销毁、分享、复制链接等特定时机。
  - 网页内 iframe 的域名也要进入白名单。
  - iOS 上若存在 JSSDK 无响应，可在 `src` 后追加 `#wechat_redirect` 作为兼容处理；链接中避免直接带中文，建议编码。

## 对 iCloush 当前项目的直接含义
- React H5 被封装进微信小程序的首要前置不是页面代码，而是业务域名、HTTPS 与主体资质合规。
- H5 需要增加对小程序 WebView 环境的显式识别分支，为支付桥接、返回小程序和埋点做条件处理。
- 若 PDP、结账页或支付页内继续引用第三方 iframe / 子资源，也要逐项核对白名单与微信环境兼容性。

## 第二轮支付桥接研究补充

### 3. 微信支付官方小程序支付产品页
- 来源：https://pay.weixin.qq.com/wechatpay_h5/pages/product/miniapp.shtml
- 关键信息：
  - 小程序支付的定义是用户在微信内打开商家小程序后，通过调用“小程序支付 API”完成支付。
  - 小程序 AppID 需要与商户号建立绑定，且主体需一致。
  - 官方产品页的标准流程是“打开小程序 → 下单 → 调起支付页 → 输入支付密码 → 回到小程序”，并不是留在 H5 内完成支付。

### 4. 微信开放社区关于“内嵌 H5 调用小程序支付”的实践文章
- 来源：https://developers.weixin.qq.com/community/develop/article/doc/000a8a727387a889edb15886066813
- 关键信息：
  - 文章给出的可执行方案不是在 H5 内直接完成微信支付，而是由 H5 使用 `wx.miniProgram.navigateTo` 跳到小程序原生支付页，再由小程序调用 `wx.requestPayment`。
  - 文中评论区明确区分了几类支付环境：`JSAPI` 只能在微信内置浏览器中使用，不能直接用于小程序内嵌 H5；`H5 支付` 主要面向非微信浏览器；`小程序支付` 只能在小程序环境中使用。

## 当前可形成的结论草案
- iCloush 现有 React H5 若封装进微信小程序，正式支付主线应是“小程序原生支付桥接”，而不是在 WebView 内继续沿用网页版微信支付调用。
- H5 负责商品浏览、加购、订单确认与参数整理；真正的支付触发应切到小程序原生页面执行，再把结果回传给 WebView。
- 若后续仍保留站外 H5 收银页，则应把“普通微信内 H5/公众号场景”和“小程序 WebView 场景”拆成两套支付环境识别与调度逻辑。
