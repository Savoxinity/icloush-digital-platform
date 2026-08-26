# iCloush 智慧工厂——Phase 038

## 秉烛 BINGZHU 严格地区单语体系 · V3.5.3

**版本定位：** BINGZHU 不再以中英混排表达品牌叙事。选定“中国大陆／简体中文／人民币”后，页面使用完整简体中文；选定“GLOBAL／ENGLISH／USD”后，页面使用面向国际文化机构与礼宾场景的自然英文。根 Gateway 同时展示两种地区入口，是用户做出语言选择前唯一允许并列出现双语言的界面。

| 区域 | 路由前缀 | 语言规则 | 交易币种 | 页面示例 |
|---|---|---|---|---|
| 中国大陆 | `/zh-cn` | 仅简体中文，包括动作、目录、规格、合规提示、定制器与失败反馈 | 人民币 CNY | “以香为礼／以器为证”“申请配额”“仅限合规陆运” |
| Global | `/en-us` | 仅自然英文，包括动作、目录、规格、合规提示、定制器与失败反馈 | 美元 USD | “Scent as offering. Object as witness.” “REQUEST ALLOCATION” “COMPLIANT GROUND ROUTING” |

## 一、实现方式

前端在 `App.tsx` 集中维护 `LOCALE_COPY` 字典、双语香气档案、双语气味资料和地区配置。页面不再自行拼接中英文文案；首页、菜单、地区遮罩、目录、档案详情、配额申请、灯笼定制和购物袋均通过当前 `LocaleProfile.textLanguage` 获取单一文本。

语言边界也延伸到动态状态。Sandbox 创建订单成功时，中文地区显示中文库存预占与 UN1266 调度说明；英文地区显示完整英文状态。服务端可能返回的原始合规 notice 或错误信息不再直接透出，以避免跨地区页面出现另一语言。

## 二、文案口径

Global 文案以陈列、典藏与礼宾语境为基准，而不是逐字翻译。例如，首页使用 “Scent as offering. Object as witness.”；目录使用 “Scent is not merchandise. It is an atmosphere of command.”；定制流使用 “LANTERN COMMISSION”。所有英文容量以 `15 ML / 50 ML` 表示，合规物流统一为 “UN1266 / COMPLIANT GROUND ROUTING”。

## 三、验证记录

| 验收项 | 结果 |
|---|---|
| TypeScript | `pnpm -F @icloush/web-bingzhu check` 通过 |
| Vitest | `src/App.test.tsx` 9/9 通过 |
| 单语契约 | 覆盖 Gateway 双地区例外、中文首页/目录、英文首页/目录、15ml/50ml、灯笼定制与中文 Sandbox 合规说明 |
| 桌面预览 | `/zh-cn/home`、`/en-us/home`、`/zh-cn/shop`、`/en-us/shop` 均按路由只显示所属地区语言 |
| H5 预览 | 同一组件在 375px 下维持单语、全屏媒介、目录触控与可读导航 |

## 四、当前边界

品牌专名 `BINGZHU` 与必要的 SKU 编码保持不翻译。Gateway 在用户选择地区前同时展示两个市场选项；一旦进入任何地区路由，所有可读描述性文本即严格遵守单语规则。
