# 微信支付 production_live 阻塞诊断备忘

## 当前结论

本轮诊断已经把此前的“微信支付签名问题”继续向前收口，并确认了一个比原先更明确的结论：**当前主阻塞已经不再是商户证书与私钥不匹配，而是接入路径仍按平台证书模式设计，但当前商户实际应切到微信支付公钥模式**。[1] [2]

用户补充上传的 `apiclient_cert.pem` 与 `apiclient_key.pem` 已被项目内的自动化诊断用例验证为**同一对商户 API 证书与私钥**。其中，证书序列号与现有 `WECHAT_PAY_CERT_SERIAL_NO` 一致，而此前环境中的 `WECHAT_PAY_PRIVATE_KEY_PEM` 与这张证书并不匹配；在将环境私钥更新为用户上传的 `apiclient_key.pem` 后，`wechat.key.diagnosis.test.ts` 已完整通过，证明商户 cert/key 配对问题已经得到修正。

随后，对 `GET /v3/certificates` 的联通探针又进一步说明了两个关键事实。第一，Node 侧 TLS 基础连通性本身是正常的：无签名的 `HEAD`/`GET` 探针可以稳定拿到 405/401 等业务层响应，而不是持续卡在握手失败。第二，带真实签名头的 `https.request` 请求已经能被微信侧正确受理，并返回 `404 RESOURCE_NOT_EXISTS`，错误信息明确指出：

> 无可用的平台证书，请在商户平台-API安全申请使用微信支付公钥。可查看指引 https://pay.weixin.qq.com/doc/v3/merchant/4012153196

这条返回与官方文档中的当前推荐方向一致。微信支付官方在“平台证书”产品介绍中已明确写出：

> 因为每张平台证书有效期为5年，如果未及时更换会影响业务，建议使用微信支付公钥模式对接，可以按需更新公钥。[1]

在“如何从平台证书切换成微信支付公钥”文档中，官方进一步说明：

> 微信支付APIv3支持平台证书和微信支付公钥两种模式构造签名验签……商户可将平台证书模式切换为微信支付公钥模式。[2]

因此，当前项目的后续实现重点不应再放在 `WECHAT_PAY_PLATFORM_CERT_PEM` 自动拉取上，而应调整为**引入微信支付公钥与公钥 ID 配置，按公钥模式完成响应验签、回调验签与敏感字段加密**。[1] [2]

## 本轮实测结果一览

| 诊断维度 | 结果 | 解释 |
| --- | --- | --- |
| 商户证书 PEM 是否存在 | 已确认 | 用户上传的 `apiclient_cert.pem` 就是所需的商户证书 PEM |
| 商户证书序列号是否与环境一致 | 已通过 | 上传证书序列号与 `WECHAT_PAY_CERT_SERIAL_NO` 一致 |
| 商户证书与当前环境私钥是否匹配 | 初始不匹配，后已修正 | 原环境私钥与上传证书公钥指纹不一致；改用上传 `apiclient_key.pem` 后配对测试通过 |
| Node 是否能解析私钥 | 已通过 | 私钥可被 Node/OpenSSL 正常加载，未命中 PEM 损坏、换行污染或显式加密私钥分支 |
| Node TLS 到微信网关是否完全不可达 | 否 | `fetch` / `https.request` 最小探针均可收到业务层 HTTP 响应 |
| `fetch` 带签名头时的异常 | 406 `PARAM_ERROR` | 微信返回“不支持的 Accept-Language”，说明默认 `fetch` 请求头仍需进一步收敛 |
| `https.request` 带签名头时的异常 | 404 `RESOURCE_NOT_EXISTS` | 说明签名已能被微信侧受理，当前问题转为“商户无可用平台证书，应走公钥模式” |

## 对现有代码路径的影响

当前 `packages/payments/src/index.ts` 里，微信 callback 的正式配置要求仍然写死为 `WECHAT_PAY_API_V3_KEY` + `WECHAT_PAY_PLATFORM_CERT_PEM`。这与当前商户实测返回和官方文档建议已经不完全一致。按照现有诊断结果，后续正式实现应优先考虑以下调整。

首先，配置层需要从“仅支持平台证书”升级为“支持平台证书或微信支付公钥二选一，且优先公钥模式”。这意味着后续需要新增诸如 `WECHAT_PAY_PUBLIC_KEY_PEM`、`WECHAT_PAY_PUBLIC_KEY_ID` 一类的环境变量，以替代对 `WECHAT_PAY_PLATFORM_CERT_PEM` 的单一路径依赖。[1] [2]

其次，回调验签与响应验签实现需要接受 `Wechatpay-Serial` 既可能是平台证书序列号，也可能是 `PUB_KEY_ID_...` 形式的平台公钥 ID。官方文档明确要求商户不要对这个字段值的构成做错误假设，而应根据头部值去匹配本地已知的公钥实例。[2]

最后，如果后续仍需兼容存量平台证书模式，则应在实现层保留“双模兼容”能力：当存在平台证书时走证书验签，当商户已切换到公钥模式时走平台公钥验签，而不是默认假设 `/v3/certificates` 必然可用。[1] [2]

## 当前剩余阻塞

虽然 cert/key 配对问题已被修正，但 production_live 仍未算真正完成，原因在于还有三层工作尚未落地。

第一层是**配置模型重构**。当前项目尚未引入微信支付公钥与公钥 ID 的环境变量，也没有在 payment callback 路径中消费它们。

第二层是**验签实现重构**。现有 `paymentWebhookCallback` 仍处在“已进入正式处理分支，但尚未补上平台证书验签与 resource 解密”的状态，需要改造成“平台证书 / 微信支付公钥兼容验签 + APIv3 解密”的真实逻辑。

第三层是**正式建单联通**。目前 `production_live` 创建分支仍是壳层结果，尚未真正调用微信支付下单接口。这意味着即使凭据阻塞已大幅减少，正式支付仍未真正闭环。

## 建议的下一步

| 优先级 | 建议动作 | 原因 |
| --- | --- | --- |
| P0 | 将待办从“平台证书自动拉取”改写为“微信支付公钥模式适配与双模兼容” | 当前商户已经被微信网关明确提示应使用公钥模式 |
| P0 | 新增 `WECHAT_PAY_PUBLIC_KEY_PEM` / `WECHAT_PAY_PUBLIC_KEY_ID` 环境变量 | 没有这两个配置，就无法按官方推荐路径继续实现 |
| P1 | 调整 `packages/payments/src/index.ts` 的 callback 配置校验逻辑 | 使其支持平台证书与平台公钥两种验签材料 |
| P1 | 规避 Node `fetch` 的默认 `Accept-Language` 干扰，优先使用可控头部的 `https.request` 或等效方案 | 当前 `fetch` 已证明会触发 406 参数错误，影响联调稳定性 |
| P2 | 在完成公钥模式验签后，再继续真实下单、回调验签与 `resource` 解密实现 | 避免在错误的验签基座上继续堆功能 |

## 当前状态归档

| 事项 | 状态 | 说明 |
| --- | --- | --- |
| 支付通道真实开关准备 | 已完成 | `production_ready` / `production_live` 已真实影响建单、状态查询与 callback 入口 |
| 商户 cert/key 配对校验 | 已完成 | 上传的 `apiclient_cert.pem` 与 `apiclient_key.pem` 已验证成对 |
| 微信支付阻塞诊断 | 基本收口 | 已确认不再是 PEM/证书配对问题，当前主阻塞为公钥模式适配与验签实现路径调整 |
| 微信支付平台证书处理 | 需改造方向 | 不宜再单独作为唯一主路径，应调整为公钥模式优先、平台证书兼容 |
| 微信支付公钥 secret 校验 | 已完成 | `WECHAT_PAY_PUBLIC_KEY_PEM` 与 `WECHAT_PAY_PUBLIC_KEY_ID` 已写入环境，并通过自动化测试验证可被归一化后识别 |
| 微信支付正式接入 | 未完成 | 仍缺公钥模式验签、回调解密与真实建单 |

## 公钥 secret 注入的新发现

在把用户提供的 `pub_key.pem` 与 `PUB_KEY_ID_...` 写入项目环境后，新增的自动化回归证明：当前环境中的 **微信支付公钥 PEM 与公钥 ID 已经具备可用性**。不过，本轮也发现了一个容易误判的问题：多行 PEM 写入环境变量后，运行时读取到的值会丢失原始空白与换行，表现为 `-----BEGINPUBLICKEY-----...-----ENDPUBLICKEY-----` 这种被压扁的单行字符串。

这意味着，如果后续代码直接把环境变量原样交给 `crypto.createPublicKey()` 或证书解析逻辑，就会把一个本来有效的公钥错误判成“凭据无效”。为避免后续正式接入再踩同样的问题，支付核心现在已经加入 **PEM 归一化** 处理：会自动恢复 `BEGIN/END` 标签中的空格，并按 PEM 规范重建 64 字符分段换行。完成归一化后，真实环境中的 `WECHAT_PAY_PUBLIC_KEY_PEM` 已可被 Node `crypto` 正常解析，且与环境中的 `WECHAT_PAY_PUBLIC_KEY_ID` 组合后，`paymentWebhookCallback` 的微信 callback 配置判定已进入 `processing` 分支，而不再停留在 `ready_for_sdk`。

## References

[1]: https://pay.weixin.qq.com/doc/v3/merchant/4012068814 "产品介绍_平台证书|微信支付商户文档中心"
[2]: https://pay.weixin.qq.com/doc/v3/merchant/4012154180 "如何从平台证书切换成微信支付公钥_微信支付公钥|微信支付商户文档中心"
