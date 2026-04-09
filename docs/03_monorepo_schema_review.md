# iCloush 全域数字商业矩阵 V1.0：Monorepo 改造与多租户 Schema 评审稿

**作者：Manus AI**

## 一、理解确认与总体判断

我已经按你最新提供的 **V1.0 PRD** 重新校正了项目方向。此前的 `icloush-digital-platform` 更接近一个单仓原型和统一前端样稿，而你现在要求的是一个能够承载 **多品牌、多业务形态、多端分发** 的生产级数字商业矩阵。这意味着项目不应继续沿着“单个 React 应用不断加页面”的方式演化，而应升级为一个以 **统一数据底座、统一支付与线索流转、统一管理后台** 为核心，同时向外分发 **SSR 官网** 与 **移动交易端** 的多应用体系。

从产品与架构上看，这份 PRD 的关键变化不是“再加三个站点”，而是将整个项目正式定义为 **多租户、多品牌、多渠道履约系统**。其中，**环洗朵科技** 承担 B2B 化料与设备租赁相关业务，**iCloush LAB.** 承担 B2C / 轻 B 端高端洗护及订阅业务，**富朵朵实业 / iCloush Care** 承担酒店奢护洗涤服务与招商信任建设。三条业务线虽然品牌表达不同，但其底层的客户资产、商品体系、订单体系、线索体系与财务流水必须在一个统一底座中治理。

基于这一判断，我建议当前仓库进入下一阶段时采用 **Monorepo + 共享包 + 多应用分发** 的建设方式。这样既能满足 **Admin Console** 的统一运营要求，也能满足 **Next.js SSR SEO 官网** 的技术要求，并为 **Taro / 小程序商城** 预留独立构建与支付接入空间。

## 二、建议采用的 Monorepo 目录结构

下表是我建议的第一阶段生产级目录结构。这里的重点不是追求目录数量，而是明确 **应用边界**、**共享能力边界** 与 **数据模型边界**。

| 层级 | 目录 | 角色定位 | 主要职责 | 当前优先级 |
|---|---|---|---|---|
| 应用层 | `apps/admin` | 管理中台 | 商品、订单、客户、询盘、内容、SEO、财务核对 | P0 |
| 应用层 | `apps/web-b2b` | SEO 官网集群 | 环洗朵科技、富朵朵、后续集团官网 SSR 官网 | P1 |
| 应用层 | `apps/web-lab` | 零售品牌官网 / 轻商城 | iCloush LAB. 官网与轻 B / B2C 转化入口 | P2 |
| 应用层 | `apps/mini-huanxiduo` | 微信小程序商城 | 环洗朵 B2B 下单、支付、订单查询 | P0 |
| 应用层 | `apps/mini-lab` | 微信小程序商城 | iCloush LAB. 零售与订阅制交易 | P2 |
| 应用层 | `apps/api-gateway` | 统一 API 层 | 对外路由、鉴权、支付编排、Webhook、品牌隔离 | P0 |
| 共享层 | `packages/database` | 数据模型层 | Drizzle Schema、迁移、查询仓储 | P0 |
| 共享层 | `packages/auth` | 账户与权限层 | B2B/B2C 账户模型、会话、RBAC、租户识别 | P0 |
| 共享层 | `packages/payments` | 支付编排层 | 微信支付、对公转账、后续 Stripe / 支付宝等抽象 | P0 |
| 共享层 | `packages/brand-core` | 品牌上下文层 | brand 配置、主题、域名、站点 Meta、导航配置 | P0 |
| 共享层 | `packages/oms` | 订单中心 | 购物车、订单、履约、发货、售后、订阅订单 | P1 |
| 共享层 | `packages/pim` | 商品中心 | SKU/SPU、分类、阶梯价、订阅计划、品牌归属 | P0 |
| 共享层 | `packages/cms` | 内容中心 | Hero、案例、Logo 墙、SEO 页面、表单内容块 | P1 |
| 共享层 | `packages/lead-gen` | 线索中心 | 询价表单、客户分发、销售线索归档 | P1 |
| 共享层 | `packages/ui` | 设计系统 | 管理后台组件、Web Portal 组件、品牌主题变量 | P1 |
| 基础设施 | `tooling/` | 工程配置 | ESLint、TSConfig、Vitest、构建脚本 | P0 |
| 基础设施 | `docs/` | 项目文档 | PRD、架构说明、数据字典、接口说明 | P0 |

为了让这一结构更容易审查，我把推荐目录树进一步展开如下。

```text
icloush-digital-platform/
├─ apps/
│  ├─ admin/                   # 现有 React + Vite 管理后台迁移目标
│  ├─ api-gateway/             # 统一 API、支付编排、Webhook、品牌识别
│  ├─ web-b2b/                 # Next.js App Router，承载环洗朵/富朵朵等SSR官网
│  ├─ web-lab/                 # Next.js App Router，承载 iCloush LAB. 官网与轻商城
│  ├─ mini-huanxiduo/          # Taro / 小程序，B2B 采购场景
│  └─ mini-lab/                # Taro / 小程序，B2C / 订阅场景
├─ packages/
│  ├─ auth/
│  ├─ brand-core/
│  ├─ cms/
│  ├─ database/
│  ├─ lead-gen/
│  ├─ oms/
│  ├─ payments/
│  ├─ pim/
│  └─ ui/
├─ tooling/
│  ├─ eslint/
│  ├─ typescript/
│  └─ vitest/
├─ docs/
├─ pnpm-workspace.yaml
├─ turbo.json
├─ package.json
└─ tsconfig.base.json
```

## 三、三大核心端的职责边界

为了避免后续开发时再次回到“所有逻辑都塞进一个应用”的状态，三大核心端需要有明确的边界。其本质是：**管理中台负责治理，官网端负责公域信任与获客，小程序端负责交易转化。**

| 端 | 技术建议 | 是否首期必做 | 核心目标 | 不应承担的职责 |
|---|---|---|---|---|
| 管理中台端 | React + Vite + Drizzle + tRPC 或等效 RPC | 是 | 管理品牌、商品、订单、线索、客户、内容、财务对账 | 不承担 SEO 主站落地页渲染 |
| SEO 官网端 | Next.js App Router + SSR/ISR | 是 | 为招投标、公域信用、自然搜索、品牌传播服务 | 不承担复杂中台运营流程 |
| 移动交易端 | Taro 或原生跨端框架 | 是 | 承接扫码下单、微信支付、复购、订阅、订单追踪 | 不承担后台治理与复杂内容编辑 |

这里还需要补充一个很关键的架构原则：**统一 API 层不能直接等同于管理中台后端。** 管理中台可以消费 API，但 API 层本身应该独立存在，因为小程序、官网表单、支付回调、外部系统对接都需要一个稳定的、品牌隔离清晰的服务接口层。

## 四、多租户建模原则

你的 PRD 明确要求引入 `brand_id` 或 `tenant_id`。从实际业务语义上，我建议采用 **tenant + brand 双层模型**，但第一阶段可以先实现 **brand_id 即租户隔离主键** 的做法，以降低复杂度。原因在于当前三条业务线已经与品牌强绑定，先把品牌当作业务隔离单位最直接；等未来出现“同一品牌下多区域公司、多个运营主体、多个经销商子租户”时，再演进为 tenant + brand 分层。

第一阶段建议遵循以下原则。

| 原则 | 说明 | 第一阶段处理方式 |
|---|---|---|
| 数据归属清晰 | 订单、商品、内容、线索、客户资产必须明确归属于某品牌 | 核心表强制 `brandId` 非空 |
| 用户可跨品牌 | 同一手机号或 openId 可能既是 B2B 客户，也可能参与 LAB 零售 | 用户主表不做品牌唯一绑定，关系表绑定品牌角色 |
| 角色按品牌生效 | 用户在不同品牌下权限不同 | 增加 `brand_memberships` 或 `customer_accounts` |
| 交易单据单品牌归属 | 一个订单只能属于一个品牌 | `orders.brandId` 强制非空 |
| 内容分品牌发布 | Hero、案例、SEO 页面与 Logo 墙按品牌独立维护 | `cms_pages.brandId`、`leads.brandId` |

这意味着 **Users 表不应简单粗暴地直接塞一个 brandId 就结束**。如果只在 `users` 上挂 `brandId`，就会限制一个主体同时与多个品牌发生关系。更合理的方式是：**Users 是身份主体；Brand Memberships / Customer Accounts 才是品牌业务关系主体。**

## 五、建议的 Drizzle 核心表结构

下面给出我建议的第一版核心表。这里的目标不是一次性覆盖所有业务，而是先把 **多品牌隔离、B2B/B2C 混合账户、商品中心、订单中心、支付闭环、询盘线索** 的骨架搭起来。

### 5.1 品牌基础表

```ts
export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 64 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  shortName: varchar("shortName", { length: 100 }),
  businessType: mysqlEnum("businessType", ["b2b", "b2c", "hybrid"]).notNull().default("hybrid"),
  domain: varchar("domain", { length: 255 }),
  siteTitle: varchar("siteTitle", { length: 255 }),
  siteDescription: text("siteDescription"),
  status: mysqlEnum("status", ["draft", "active", "archived"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

建议初始化三条记录：`huanxiduo`、`icloush-lab`、`icloush-care`。如果未来还要把“智慧工厂”单独作为集团官网或制造底座品牌展示，也可以追加第四条品牌记录。

### 5.2 用户主表与品牌关系表

用户主表仍然承担身份识别职责，但业务身份需要拆到品牌关系表中。

```ts
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  unionId: varchar("unionId", { length: 64 }),
  mobile: varchar("mobile", { length: 32 }),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  accountType: mysqlEnum("accountType", ["personal", "enterprise"]).notNull().default("personal"),
  globalRole: mysqlEnum("globalRole", ["user", "sales", "finance", "ops", "admin", "super_admin"]).notNull().default("user"),
  status: mysqlEnum("status", ["active", "disabled", "pending"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const brandMemberships = mysqlTable("brandMemberships", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  userId: int("userId").notNull(),
  memberType: mysqlEnum("memberType", ["b2b_customer", "b2c_customer", "brand_admin", "sales", "finance", "ops"]).notNull(),
  enterpriseName: varchar("enterpriseName", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }),
  creditLimit: int("creditLimit"),
  priceLevel: varchar("priceLevel", { length: 64 }),
  isDefaultBrand: boolean("isDefaultBrand").notNull().default(false),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "active", "disabled"]).notNull().default("pending"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

这套设计能同时支持以下业务情况：同一用户既可以是 **环洗朵 B2B 企业采购账号**，也可以是 **LAB 的个人零售用户**；同一个后台运营人员也可以拥有多个品牌的后台权限。

### 5.3 商品中心：品牌、分类、SPU、SKU、阶梯价、订阅计划

为了满足环洗朵的 B2B 阶梯定价与 LAB 的订阅制，商品模型至少要拆到 **SPU / SKU / Pricing Rules / Subscription Plans** 四层。

```ts
export const productCategories = mysqlTable("productCategories", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  parentId: int("parentId"),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  categoryId: int("categoryId"),
  productType: mysqlEnum("productType", ["physical", "service", "rental", "subscription"]).notNull().default("physical"),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  subtitle: varchar("subtitle", { length: 255 }),
  description: text("description"),
  unit: varchar("unit", { length: 64 }),
  status: mysqlEnum("status", ["draft", "active", "inactive", "archived"]).notNull().default("draft"),
  seoTitle: varchar("seoTitle", { length: 255 }),
  seoDescription: text("seoDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productSkus = mysqlTable("productSkus", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  productId: int("productId").notNull(),
  skuCode: varchar("skuCode", { length: 100 }).notNull().unique(),
  specName: varchar("specName", { length: 255 }),
  packSize: varchar("packSize", { length: 100 }),
  basePrice: int("basePrice").notNull(),
  marketPrice: int("marketPrice"),
  stockQty: int("stockQty").notNull().default(0),
  minOrderQty: int("minOrderQty").notNull().default(1),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const skuTierPrices = mysqlTable("skuTierPrices", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  skuId: int("skuId").notNull(),
  minQty: int("minQty").notNull(),
  maxQty: int("maxQty"),
  price: int("price").notNull(),
  customerType: mysqlEnum("customerType", ["b2b", "b2c", "all"]).notNull().default("all"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  productId: int("productId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  billingCycle: mysqlEnum("billingCycle", ["weekly", "monthly", "quarterly"]).notNull().default("monthly"),
  deliveryRule: varchar("deliveryRule", { length: 255 }),
  price: int("price").notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 5.4 订单中心：购物车、订单、订单项、支付单、转账凭证

这部分是 Sprint 1 的关键。因为你的第一优先级不是“把商城做漂亮”，而是 **让 B 端客户尽快形成真实交易闭环**。

```ts
export const carts = mysqlTable("carts", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  userId: int("userId").notNull(),
  status: mysqlEnum("status", ["active", "checked_out", "abandoned"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const cartItems = mysqlTable("cartItems", {
  id: int("id").autoincrement().primaryKey(),
  cartId: int("cartId").notNull(),
  brandId: int("brandId").notNull(),
  productId: int("productId").notNull(),
  skuId: int("skuId").notNull(),
  quantity: int("quantity").notNull(),
  selectedPrice: int("selectedPrice").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  userId: int("userId").notNull(),
  membershipId: int("membershipId"),
  orderNo: varchar("orderNo", { length: 64 }).notNull().unique(),
  orderType: mysqlEnum("orderType", ["b2b_purchase", "b2c_purchase", "subscription", "service", "rental"]).notNull(),
  channel: mysqlEnum("channel", ["admin", "web", "mini_program", "sales_manual"]).notNull().default("web"),
  status: mysqlEnum("status", ["pending_payment", "paid", "under_review", "processing", "shipped", "completed", "cancelled", "closed"]).notNull().default("pending_payment"),
  paymentStatus: mysqlEnum("paymentStatus", ["unpaid", "paid", "part_paid", "offline_review", "refunded"]).notNull().default("unpaid"),
  fulfillmentStatus: mysqlEnum("fulfillmentStatus", ["unfulfilled", "processing", "partial_shipped", "shipped", "delivered"]).notNull().default("unfulfilled"),
  currency: varchar("currency", { length: 16 }).notNull().default("CNY"),
  subtotalAmount: int("subtotalAmount").notNull(),
  discountAmount: int("discountAmount").notNull().default(0),
  shippingAmount: int("shippingAmount").notNull().default(0),
  payableAmount: int("payableAmount").notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  brandId: int("brandId").notNull(),
  productId: int("productId").notNull(),
  skuId: int("skuId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(),
  skuLabel: varchar("skuLabel", { length: 255 }),
  unitPrice: int("unitPrice").notNull(),
  quantity: int("quantity").notNull(),
  lineAmount: int("lineAmount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  orderId: int("orderId").notNull(),
  paymentNo: varchar("paymentNo", { length: 64 }).notNull().unique(),
  provider: mysqlEnum("provider", ["wechat_jsapi", "wechat_native", "alipay", "stripe", "offline_bank_transfer"]).notNull(),
  paymentScenario: mysqlEnum("paymentScenario", ["full_payment", "installment", "credit_card", "deposit", "offline_review"]).notNull().default("full_payment"),
  amount: int("amount").notNull(),
  status: mysqlEnum("status", ["created", "pending", "paid", "failed", "cancelled", "reviewing", "refunded"]).notNull().default("created"),
  externalTransactionId: varchar("externalTransactionId", { length: 128 }),
  metaJson: json("metaJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  paidAt: timestamp("paidAt"),
});

export const bankTransferReceipts = mysqlTable("bankTransferReceipts", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  orderId: int("orderId").notNull(),
  paymentId: int("paymentId"),
  payerName: varchar("payerName", { length: 255 }),
  payerAccountNo: varchar("payerAccountNo", { length: 128 }),
  receiptFileKey: varchar("receiptFileKey", { length: 255 }),
  receiptFileUrl: varchar("receiptFileUrl", { length: 500 }),
  reviewStatus: mysqlEnum("reviewStatus", ["pending", "approved", "rejected"]).notNull().default("pending"),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

### 5.5 询盘与官网线索表

官网如果要真正服务招投标与销售转化，就不能只是静态展示。表单必须直接进入统一后台。

```ts
export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  sourceSite: varchar("sourceSite", { length: 100 }).notNull(),
  sourcePage: varchar("sourcePage", { length: 255 }),
  companyName: varchar("companyName", { length: 255 }),
  contactName: varchar("contactName", { length: 255 }).notNull(),
  mobile: varchar("mobile", { length: 32 }),
  email: varchar("email", { length: 320 }),
  roomCount: int("roomCount"),
  laundryVolume: varchar("laundryVolume", { length: 100 }),
  message: text("message"),
  leadStatus: mysqlEnum("leadStatus", ["new", "assigned", "contacted", "qualified", "closed", "invalid"]).notNull().default("new"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

## 六、为什么我不建议只修改 Users / Products / Orders 三张表就收工

你在交接指令中提到“立即修改 `drizzle/schema.ts`，在关键表 `Users`, `Products`, `Orders` 中强制引入 `brand_id` 外键，建立 `brands` 基础表”。这个方向是对的，但如果仅仅把三张表补一个 `brand_id` 字段，系统仍然不足以支撑真实业务，原因主要有三点。

第一，**用户并不天然等于品牌资产**。同一用户可以跨品牌消费，甚至既是企业采购联系人，又是个人零售用户，因此用户与品牌之间需要关系表。

第二，**订单支付链路不是 Orders 一张表能表达的**。你的商业目标中明确包括“信用卡支付”“分期支付”“对公转账凭证上传审核”，这些都需要独立支付表和线下凭证审核表。

第三，**商品中心必须支持不同定价规则**。环洗朵的阶梯价与 LAB 的订阅制，本质上要求商品模型可扩展，而不是一个 `products.price` 字段就能搞定。

因此，我建议第一轮 Schema 改造时至少同步落地：`brands`、`users`、`brandMemberships`、`products`、`productSkus`、`skuTierPrices`、`orders`、`orderItems`、`payments`、`bankTransferReceipts`、`leads`。这已经是比较克制、但业务上足够成立的 P0/P1 骨架。

## 七、Sprint 1 的推荐实施顺序

结合你给出的 Roadmap，我建议 Sprint 1 的开发顺序不要从页面开始，而要从 **数据与接口闭环** 开始。只有这样，后续不论是小程序、官网还是后台都能稳定复用。

| 顺序 | 工作项 | 目标 | 交付结果 |
|---|---|---|---|
| 1 | Monorepo 初始化 | 建立多应用工作区 | `apps/` + `packages/` 基础结构 |
| 2 | 数据库多租户改造 | 落地 `brands` 与核心业务表 | Drizzle Schema + 迁移脚本 |
| 3 | API Gateway 骨架 | 提供统一品牌识别与鉴权入口 | 商品、订单、支付基础路由 |
| 4 | 环洗朵 B2B 商品链路 | 实现列表、详情、阶梯价读取 | 小程序可调商品接口 |
| 5 | 下单与支付创建 | 形成真实交易闭环 | 下单接口、支付单创建接口 |
| 6 | 对公转账审核闭环 | 覆盖超大额 B2B 订单 | 凭证上传与后台审核 |
| 7 | Admin Console 接单能力 | 让运营团队能管理真实订单 | 订单列表、审核、状态流转 |
| 8 | SSR 官网首屏 | 为后续 SEO 与客户背书抢先落地 | Hero、Logo 墙、询盘表单 |

换句话说，**Sprint 1 的完成标准不是页面数量，而是“环洗朵 B2B 客户可以真实下单并形成可追踪支付单”。** 这是最符合你“现金流防御”目标的做法。

## 八、我建议你本轮先审这两件事

在正式开始代码级 Monorepo 改造之前，我建议你优先确认以下两项，因为它们会直接决定后续迁移路径和开发成本。

| 待确认事项 | 我的当前建议 | 你需要决定的点 |
|---|---|---|
| Monorepo 技术栈 | `pnpm workspace + turbo` | 是否接受以此作为标准工程底座 |
| 多租户模型 | 第一阶段以 `brandId` 为主隔离键，用户通过关系表关联品牌 | 是否接受“Users 不直接唯一绑定单一品牌”的建模方式 |
| SEO 官网拆分 | `web-b2b` 承载环洗朵与富朵朵，`web-lab` 独立承载 LAB | 是否接受 LAB 单独一端，还是要求所有官网先并入一个 Next.js 应用 |
| 支付路线 | 先抽象 `payments`，接口层预留微信支付 / 对公转账；Stripe 作为保留通道 | 是否要在第一阶段保留 Stripe 兼容，但不优先实施 |
| 小程序策略 | 先做 `mini-huanxiduo`，LAB 小程序放 Sprint 3 | 是否接受按 PRD 节奏分阶段推进 |

## 九、建议的下一步执行指令

如果你认可本评审稿，我下一步会直接进入代码级实施，并按如下顺序推进：先把当前仓库升级为 **Monorepo**，然后把现有后台迁入 `apps/admin`，再重写 `packages/database` 的 Drizzle Schema，最后补 `apps/api-gateway` 与 `apps/web-b2b` 的脚手架。

在你确认后，我会继续输出第二轮可审查物，内容包括：**迁移后的实际目录树、Drizzle 可执行 schema 文件、首批迁移 SQL、以及 Sprint 1 的 API 路由列表定义**。
