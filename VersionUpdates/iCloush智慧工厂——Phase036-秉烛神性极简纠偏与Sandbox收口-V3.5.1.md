# iCloush 智慧工厂——Phase 036

## 秉烛 BINGZHU 神性极简纠偏与 Sandbox 收口 · V3.5.1

**版本定位：** 本版本撤销 V3.5.0 的玄漆暗场视觉方向，将 `apps/web-bingzhu` 纠正为“当代极简科幻的神性（Divine Minimalism）”官网：以羊皮纸的呼吸感承接策展陈列，以纯白直角画框承接产品，以轻触显影替代传统电商网格。

> MVP 仍坚持 **Sandbox 默认交易**。本版本没有恢复真实微信扣款；配额按钮会在服务器侧完成库存预占、模拟支付成功和“待发货”状态回写。

| 范围 | V3.5.1 变更 | 演示结果 |
|---|---|---|
| 全局 VI | 背景改为 `#F5F2EB`，容器改为 `#FFFFFF`，文字改为 `#2C2A29` | 全站不再使用纯黑背景、圆角或阴影 |
| 字体 | Noto Serif SC、Bodoni Moda、IBM Plex Mono | 中文、英文标题和参数文本具备明确层级 |
| Gateway | Asia Pacific / 简体中文 / CNY 与 Global / English / USD 无边框入口 | 偏好写入 localStorage，并允许通过顶部坐标全屏重选 |
| Haptic Shelf | 左侧名录 + 右侧纯白画框 + CSS 700ms 氛围显影 | Hover、触控与长按都能触发显影，不显示损坏图片图标 |
| 规格 | BINGZHU 预制香水服务端仅允许 15ml / 50ml | 数据库演示目录已核对无 100ml；Custom SKU 的 `1 set` 仅用于灯笼定制例外 |
| Sandbox | tRPC 零售下单改为同步模拟结算 | 库存预占后即时回传 payment `paid` 与 fulfillment `unfulfilled`（待发货） |
| 合规 | 保留 UN1266 陆运/合规仓决策 | 配额页面持续展示来自 OMS 的服务端调度提示 |

## 一、明亮神性视觉系统

旧的玄漆暗场、冷雾光轨和赛博朋克语汇已从 `App.tsx` 与 `index.css` 中移除。新的 UI 以灰米色外场和白色陈列框形成自然切割，不通过阴影、毛玻璃或圆角塑造层级。库金 `#B89C65` 与朱砂 `#9E1B14` 只用于坐标、细线和 Hover 反馈。

| 路由 | 新的交互语义 |
|---|---|
| `/?market=choose` | 强制展示 Gateway，便于已保存地区偏好后的复核和演示 |
| `/` | 读取既有 locale 偏好后自动进入 `/:locale/home` |
| `/:locale/home` | 纯白产品画框中的签名香，使用轻量文案建立“国礼级签名香”叙事 |
| `/:locale/shop` | 文本香型目录控制右侧画框，画框默认白底产品摄影，交互后平滑显影氛围层并反转参数颜色 |
| `/:locale/allocation/:slug` | 15ml / 50ml 选择、Sandbox 成功回显与 UN1266 路由提示 |

## 二、规格与 Sandbox 订单收口

OMS 在加载 BINGZHU 预制香水时按产品编码识别 `BZ-` 系列，并拒绝除 `15ml` 与 `50ml` 之外的规格。`BZ-LANTERN-CUSTOM` 被显式保留为定制器的 `1 set` 例外，因此不影响 HEAD、BODY_WRAP、BASE 三段组件订单。

零售路由不再通过定时器等待约六秒才将 Sandbox 订单写为已支付。订单创建完成、库存行锁与条件扣减成功后，会立即调用 `settleSandboxOrderPayment`。返回给前端的订单状态为 `paid`，履约状态为 `unfulfilled`；前端将其解释为“模拟支付成功 / 库存已预占 / 待发货”。UN1266 的航空禁运和即时自提筛查仍由 OMS 负责，不由浏览器自行决定。

## 三、验收记录

| 验收项 | 结果 |
|---|---|
| `web-bingzhu` TypeScript 检查 | 通过 |
| 前端 Gateway、首页、货架、规格与 Sandbox 文案回归 | 7/7 通过 |
| web-bingzhu tRPC 目录、Sandbox 成功与品牌隔离回归 | 15/15 通过 |
| OMS 库存、双币种、Custom SKU、UN1266 与 100ml 拒绝回归 | 10/10 通过 |
| BINGZHU 真实数据库 SKU 核对 | 5 条 SKU：4 条预制香水仅为 15ml/50ml，1 条灯笼定制为 `1 set` |
| 浏览器预览 | Gateway、首页、名录及配额页已在 1280px 桌面和 375px 移动 H5 视口核验 |

## 四、后续边界

氛围显影已由 CSS 背景层承接，默认白底产品摄影在任何异步资产加载时都保持完整。后续可在主理人确认视觉方向后，为每个实际 SKU 替换为正式棚拍和授权的情绪大片；真实微信 JSAPI 联调仍需取得可用 `payerOpenId` 后再开启。
