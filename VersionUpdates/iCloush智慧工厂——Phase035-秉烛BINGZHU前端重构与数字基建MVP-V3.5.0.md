# iCloush 智慧工厂——Phase 035

## 秉烛 BINGZHU 前端重构与数字基建 MVP · V3.5.0

**版本定位：** 本版本冻结原 iCloush 日化 B2B 前台的新增演进，保留既有 Monorepo 中的 OMS、payments 和 database 作为底座，并新增独立的 `apps/web-bingzhu`。交付目标是支持“中后台上架 + 策展式品牌官网陈列 + Sandbox 订单演示”的秉烛 BINGZHU MVP。

> 本版本所有线上演示下单均明确停留在 **Sandbox**。真实微信 JSAPI 联调仍需后续提供可用 `payerOpenId` 后恢复，不在本次演示范围内。

| 维度 | 已交付能力 | 当前边界 |
|---|---|---|
| 品牌前台 | 独立 `web-bingzhu` workspace、守门员、首页、档案馆、PDP、配额页、灯笼定制器 | 不替代原后台/OMS 管理入口 |
| 国际化与币种 | `/zh-cn` 锁定 CNY，`/en-us` 锁定 USD | 本期以路由级 locale context 为主，尚未接入运营端翻译管理 |
| 商品与定制 | 15ml/50ml SKU、HEAD/BODY_WRAP/BASE 组件组合、Custom SKU 快照 | 图片上传型 Body Wrap 保留为后续素材上传能力 |
| 订单与支付 | tRPC 零售订单、Sandbox 支付、CNY/USD 定价、组件附加价 | 真实微信付款闭环暂不执行 |
| 物流合规 | UN1266 地址/自提筛查、危化品陆运/合规仓调度决定、订单快照 | 物流服务商接口与仓配库存联动作为后续集成项 |

## 一、前端与视觉系统

`apps/web-bingzhu` 以 `apps/web-b2b` 的稳定 tRPC、测试和服务端骨架为脚手架创建，并由根项目脚本切换至秉烛开发入口。原 B2B 业务线没有删除；其 OMS、支付、数据库和品牌隔离能力继续作为共用底层。

秉烛页面强制采用“五色珐琅”约束：玄漆 `#120E0C` 作为全站底色，月白 `#EDE6D6` 用于主文本，库金 `#C9A227` 与朱砂 `#9E1B14` 仅用于 1px 交互与校准线。中文以 Noto Serif SC 承载，英文与数字标题使用 Bodoni Moda，规格与状态信息使用 IBM Plex Mono。所有容器保持锐利直角；未使用圆角卡片、毛玻璃或发光阴影。

| 路由 | 页面职责 | 关键行为 |
|---|---|---|
| `/` | 国际化守门员 | Asia/CNY 与 Global/USD 分流 |
| `/:locale/home` | 首屏神殿 | 暗光香气标本、冷雾轨迹、极简导航和品牌主张 |
| `/:locale/shop` | 名录式档案馆 | 文本 SKU 名录与 Hover/Touch 显影，不采用电商网格 |
| `/:locale/objects/:slug` | 单品档案 | 香气叙事、规格表与配额入口 |
| `/:locale/allocation/:slug` | 预制款漏斗 | 15ml/50ml、CNY/USD、Sandbox 订单与物流合规输入 |
| `/:locale/lantern` | Lantern DIY Builder | HEAD/BODY_WRAP/BASE 组合、实时双币种定价与 Custom SKU 订单 |

## 二、数据模型与订单底座

共享 `packages/database` 已完成以下可迁移变更：

| 数据对象 | 本期扩展 | 作用 |
|---|---|---|
| `products` | `price_usd` | 产品级 Global/USD 定价基线 |
| `productSkus` | `price_usd` | 15ml/50ml 等规格级 USD 精确定价 |
| `product_components` | `HEAD`、`BODY_WRAP`、`BASE`、CNY/USD 附加价、品牌主键与状态 | 灯笼定制的可售组件目录 |
| `orders` | `currency` 限定 CNY/USD、`logisticsJson` | 双币种订单与 UN1266 物流快照 |
| `orderItems` | `customizationJson` | Custom SKU 不可变组合快照 |

数据库已初始化 BINGZHU 演示品牌记录、3 个可售对象、5 个规格 SKU 和 6 个定制组件。三个商品均写入 `__retail_payment_mode=sandbox`，因此演示下单不会因商品配置进入 `production_live`。

OMS 在创建订单时会校验组件必须属于当前品牌、完整包含 HEAD/BODY_WRAP/BASE 三段且无重复；会按 CNY/USD 选择产品与 SKU 价格，并将组件加价、币种和组合快照写入订单、订单项与支付元数据。

## 三、UN1266 危化品物流保护

对含双脱醛 99% 乙醇的秉烛订单，OMS 统一计算 `UN1266` 合规决策。筛查不由前端信任输入决定，而由服务端在订单创建时执行，并将决定写入 `orders.logisticsJson`。

| 命中条件 | 服务端调度模式 | 面向用户的结果 |
|---|---|---|
| 区域或地址摘要包含机场、空港、航站楼、航空、机场货运或机场物流 | `hazmat_ground_delivery` | 禁止进入航空链路，提示转危化品陆运与合规仓确认 |
| 选择即时自提 | `compliance_warehouse_dispatch` | 不安排普通即时取件，提示由合规仓确认交接条件 |
| 未命中上述条件 | `standard_dispatch` | 仍按合规地面配送规则处理，不进入航空运输链路 |

前端的预制款配额页和灯笼定制器均提供配送方式与区域摘要输入，并展示 OMS 返回的最终调度模式。该设计避免前端自行判断危险品运输路径。

## 四、验证记录

本版本完成了以下定向验证：

| 验证对象 | 结果 |
|---|---|
| `@icloush/database` TypeScript 检查 | 通过 |
| OMS：双币种、Custom SKU、库存与 UN1266 合规回归 | 9/9 通过 |
| `web-bingzhu` TypeScript 检查 | 通过 |
| `web-bingzhu` 前端路由与视觉结构回归 | 7/7 通过 |
| `web-bingzhu` tRPC 目录、Sandbox 订单与物流字段回归 | 15/15 通过 |
| 浏览器预览 | 守门员、首页、档案馆、配额页、灯笼定制器均已在 1280px 桌面与 375px 移动 H5 视口核验；移动端可展示真实 SKU 价格、组件选项与 UN1266 配送输入 |

## 五、后续恢复项

后续若进入真实交易阶段，应先完成可用 `payerOpenId` 的微信 JSAPI 联调，再启用对应商品的 `production_live`。此外，建议后续接入危化品物流服务商、合规仓库存与省市区精确地址解析，并为 Body Wrap 的来稿上传增加对象存储与内容治理流程。
