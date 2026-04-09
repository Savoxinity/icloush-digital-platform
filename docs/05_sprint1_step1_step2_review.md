# iCloush Sprint 1 审查材料：Monorepo 初始化与多租户 Schema 改造

## 一、阶段结论

按照你确认的 V1.0 PRD，我已经先完成了 **Sprint 1 的第 1 步和第 2 步**。当前代码库已从原先的单体草稿重构为基于 **pnpm workspace + turbo** 的 Monorepo 结构；原有管理后台已迁移到 `apps/admin`；数据库模型已迁移到 `packages/database`，并完成了面向多品牌矩阵的 **多租户 Drizzle Schema** 设计与迁移脚本生成。

这一步的目标不是把业务能力全部做完，而是先把后续 API Gateway、官网 SSR、小程序交易端可以长期演进的底座搭稳。当前底座已经满足下一阶段继续开发的基本条件：工作区可统一调度、数据库模型已以 `brandId` 为核心完成业务隔离、后台鉴权已开始兼容新的多租户用户结构，且迁移脚本已成功生成。

## 二、当前 Monorepo 目录结构

当前保留的关键目录如下，重点是 `apps/*` 负责终端应用，`packages/*` 负责共享能力与领域模块。

```text
icloush-digital-platform/
├── apps/
│   ├── admin/                  # 现有 React + Vite 管理后台
│   ├── api-gateway/            # 预留：Sprint 1 下一步的小程序/API 聚合层
│   ├── web-b2b/                # 预留：环洗朵 / B2B SSR 官网
│   ├── web-lab/                # 预留：iCloush LAB. 独立 SSR 站点
│   ├── mini-huanxiduo/         # 预留：环洗朵小程序交易端
│   └── mini-lab/               # 预留：LAB 小程序交易端
├── packages/
│   ├── database/               # Drizzle schema / migration / relations
│   ├── auth/                   # 预留：统一鉴权域能力
│   ├── brand-core/             # 预留：品牌/租户核心能力
│   ├── cms/                    # 预留：内容发布能力
│   ├── pim/                    # 预留：商品信息管理
│   ├── oms/                    # 预留：订单管理
│   ├── payments/               # 预留：支付域（微信/转账审核优先）
│   ├── lead-gen/               # 预留：线索收集与入后台
│   └── ui/                     # 预留：共享 UI 组件与设计系统
├── docs/
├── pnpm-workspace.yaml
├── turbo.json
├── package.json
└── drizzle.config.ts
```

如果按你刚刚确认的产品路线继续推进，下一步最合理的开发顺序就是：**先做 `apps/api-gateway` + `packages/payments` 的微信支付与对公转账审核闭环，再同步起 `apps/web-b2b` 的 SSR 官网骨架**。

## 三、根工作区与应用迁移结果

本次结构改造的核心变化如下。

| 项目 | 当前状态 | 说明 |
| --- | --- | --- |
| 根工作区 | 已完成 | 已建立 `pnpm-workspace.yaml` 与 `turbo.json` |
| 管理后台 | 已迁移 | 原有后台迁移至 `apps/admin` |
| 数据库域 | 已迁移 | `packages/database` 成为统一 schema 与 migration 来源 |
| SSR 官网端 | 已预留 | `apps/web-b2b`、`apps/web-lab` 已创建骨架目录 |
| 小程序端 | 已预留 | `apps/mini-huanxiduo`、`apps/mini-lab` 已创建骨架目录 |
| 领域包 | 已预留 | `payments`、`oms`、`pim`、`cms` 等领域包已预留 |

需要说明的是，当前 `apps/web-b2b`、`apps/web-lab`、小程序端与 API Gateway 还只是 **工作区占位骨架**，这次没有提前写死实现，以免在架构确认前造成错误耦合。

## 四、多租户 Schema 设计原则

这次数据库改造遵循了你确认的三条关键原则：

第一，**用户底层账号打通**。`users` 作为全局账号表，不直接与单品牌强绑定，因此同一微信、手机号或统一身份可以跨品牌复用。

第二，**业务资产按品牌隔离**。订单、商品、线索、购物车、支付记录、转账凭证等业务表全部显式携带 `brandId`，确保品牌维度的数据边界清晰。

第三，**品牌关系通过关联表表达**。`brandMemberships` 负责表达用户在某个品牌下的身份、审批状态、授信、价格等级与默认归属，这比把用户简单绑定到单一品牌更适合你们当前的矩阵经营模型。

## 五、核心 Schema 代码说明

### 1. 品牌主表 `brands`

`brands` 是整个矩阵的租户主表，用来定义每个品牌/业务线的基础身份、站点信息与启停状态。

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

### 2. 全局账号表 `users`

`users` 保留为平台级统一身份表，负责沉淀 openId、unionId、mobile、账户类型与全局权限。

```ts
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  unionId: varchar("unionId", { length: 64 }),
  mobile: varchar("mobile", { length: 32 }),
  email: varchar("email", { length: 320 }),
  name: varchar("name", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  accountType: mysqlEnum("accountType", ["personal", "enterprise"]).notNull().default("personal"),
  globalRole: mysqlEnum("globalRole", ["user", "sales", "finance", "ops", "admin", "super_admin"]).notNull().default("user"),
  status: mysqlEnum("status", ["active", "disabled", "pending"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
```

### 3. 用户-品牌关系表 `brandMemberships`

这是多租户设计的关键表。它负责表达用户在品牌下的成员类型、企业身份、授信额度、价格等级与审批状态。

```ts
export const brandMemberships = mysqlTable(
  "brandMemberships",
  {
    id: int("id").autoincrement().primaryKey(),
    brandId: int("brandId").notNull(),
    userId: int("userId").notNull(),
    memberType: mysqlEnum("memberType", ["b2b_customer", "b2c_customer", "brand_admin", "sales", "finance", "ops"])
      .notNull(),
    enterpriseName: varchar("enterpriseName", { length: 255 }),
    contactName: varchar("contactName", { length: 255 }),
    creditLimit: bigint("creditLimit", { mode: "number", unsigned: true }),
    priceLevel: varchar("priceLevel", { length: 64 }),
    isDefaultBrand: boolean("isDefaultBrand").notNull().default(false),
    status: mysqlEnum("status", ["pending", "approved", "rejected", "active", "disabled"]).notNull().default("pending"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    brandUserUnique: uniqueIndex("brandMemberships_brand_user_unique").on(table.brandId, table.userId),
  }),
);
```

### 4. 商品与价格体系

商品域已按品牌隔离，并且预埋了适合环洗朵 B2B 阶梯价和 LAB 周期购的结构。这里最重要的是 `products`、`productSkus`、`skuTierPrices` 和 `subscriptionPlans` 四张表。

```ts
export const products = mysqlTable(
  "products",
  {
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
  },
  (table) => ({
    brandSlugUnique: uniqueIndex("products_brand_slug_unique").on(table.brandId, table.slug),
  }),
);
```

```ts
export const skuTierPrices = mysqlTable("skuTierPrices", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  skuId: int("skuId").notNull(),
  minQty: int("minQty").notNull(),
  maxQty: int("maxQty"),
  price: bigint("price", { mode: "number", unsigned: true }).notNull(),
  customerType: mysqlEnum("customerType", ["b2b", "b2c", "all"]).notNull().default("all"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
```

```ts
export const subscriptionPlans = mysqlTable("subscriptionPlans", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  productId: int("productId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  billingCycle: mysqlEnum("billingCycle", ["weekly", "monthly", "quarterly"]).notNull().default("monthly"),
  deliveryRule: varchar("deliveryRule", { length: 255 }),
  price: bigint("price", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

### 5. 订单与支付体系

订单和支付已经围绕你要求的 **微信优先 + 对公转账审核闭环** 做了模型预埋。

```ts
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
  subtotalAmount: bigint("subtotalAmount", { mode: "number", unsigned: true }).notNull(),
  discountAmount: bigint("discountAmount", { mode: "number", unsigned: true }).notNull().default(0),
  shippingAmount: bigint("shippingAmount", { mode: "number", unsigned: true }).notNull().default(0),
  payableAmount: bigint("payableAmount", { mode: "number", unsigned: true }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

```ts
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  orderId: int("orderId").notNull(),
  paymentNo: varchar("paymentNo", { length: 64 }).notNull().unique(),
  provider: mysqlEnum("provider", ["wechat_jsapi", "wechat_native", "alipay", "stripe", "offline_bank_transfer"]).notNull(),
  paymentScenario: mysqlEnum("paymentScenario", ["full_payment", "installment", "credit_card", "deposit", "offline_review"]).notNull().default("full_payment"),
  amount: bigint("amount", { mode: "number", unsigned: true }).notNull(),
  status: mysqlEnum("status", ["created", "pending", "paid", "failed", "cancelled", "reviewing", "refunded"]).notNull().default("created"),
  externalTransactionId: varchar("externalTransactionId", { length: 128 }),
  metaJson: json("metaJson"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  paidAt: timestamp("paidAt"),
});
```

```ts
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

### 6. 官网获客线索表 `leads`

SEO 官网线索已经预留到统一后台，后续可以直接承接询盘表单、客户 Logo 墙 CTA、试样申请或酒店合作咨询。

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

## 六、迁移脚本结果

本次已成功生成新的数据库迁移脚本，当前关键文件如下。

| 文件 | 状态 | 说明 |
| --- | --- | --- |
| `packages/database/schema.ts` | 已更新 | 多租户核心表结构来源 |
| `packages/database/drizzle.config.ts` | 已新增 | 数据库包独立迁移配置 |
| `packages/database/migrations/0000_wide_shinko_yamashiro.sql` | 已生成 | 本次多租户改造迁移脚本 |
| `drizzle.config.ts` | 已改造 | 根入口已改为指向 `packages/database` |

## 七、校验结果

为了避免只停留在“文件已写入”的层面，我做了两类校验。

| 校验项 | 结果 | 说明 |
| --- | --- | --- |
| `pnpm --filter @icloush/database check` | 通过 | 数据库包 TypeScript 类型检查通过 |
| `pnpm --filter @icloush/admin test` | 通过 | 后台现有 Vitest 单测通过 |
| `pnpm db:generate` | 通过 | 新 migration 已成功生成 |
| 开发服务重启 | 已完成 | 根级运行链路已切换到 `apps/admin` |

当前还存在一个需要说明的小点：`apps/admin` 重新启动后日志中出现了 **`OAUTH_SERVER_URL is not configured`** 的提醒，这说明当前开发服务虽然已经从 Monorepo 新入口启动，但运行环境中的 OAuth 变量未正确注入到新链路。这个问题不影响你本次审查目录结构与 Schema 改造结果，但在进入 API Gateway 和登录相关接口开发前，我会优先把环境注入链路补齐。

## 八、建议的下一步

如果你对这份目录结构和 Schema 草案没有异议，我会直接进入你指定的下一阶段，也就是：

1. 启动 `apps/api-gateway` 的 Sprint 1 API 设计与脚手架；
2. 优先落地小程序商品列表、创建订单、支付创建、订单查询接口；
3. 在 `packages/payments` 中先实现 **微信支付 + 对公转账审核闭环** 的领域模型；
4. 随后再起 `apps/web-b2b` 的 Next.js App Router 首屏与客户 Logo 墙。

这会严格遵循你批准的实施顺序，不会提前把 LAB 官网或消费端页面做散。
