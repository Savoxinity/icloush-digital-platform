import {
  bigint,
  boolean,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

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

export const productCategories = mysqlTable(
  "productCategories",
  {
    id: int("id").autoincrement().primaryKey(),
    brandId: int("brandId").notNull(),
    parentId: int("parentId"),
    name: varchar("name", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull(),
    sortOrder: int("sortOrder").notNull().default(0),
    status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    brandSlugUnique: uniqueIndex("productCategories_brand_slug_unique").on(table.brandId, table.slug),
  }),
);

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

export const productSkus = mysqlTable(
  "productSkus",
  {
    id: int("id").autoincrement().primaryKey(),
    brandId: int("brandId").notNull(),
    productId: int("productId").notNull(),
    skuCode: varchar("skuCode", { length: 100 }).notNull(),
    specName: varchar("specName", { length: 255 }),
    packSize: varchar("packSize", { length: 100 }),
    basePrice: bigint("basePrice", { mode: "number", unsigned: true }).notNull(),
    marketPrice: bigint("marketPrice", { mode: "number", unsigned: true }),
    stockQty: int("stockQty").notNull().default(0),
    minOrderQty: int("minOrderQty").notNull().default(1),
    status: mysqlEnum("status", ["active", "inactive"]).notNull().default("active"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    brandSkuUnique: uniqueIndex("productSkus_brand_sku_unique").on(table.brandId, table.skuCode),
  }),
);

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
  selectedPrice: bigint("selectedPrice", { mode: "number", unsigned: true }).notNull(),
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
  subtotalAmount: bigint("subtotalAmount", { mode: "number", unsigned: true }).notNull(),
  discountAmount: bigint("discountAmount", { mode: "number", unsigned: true }).notNull().default(0),
  shippingAmount: bigint("shippingAmount", { mode: "number", unsigned: true }).notNull().default(0),
  payableAmount: bigint("payableAmount", { mode: "number", unsigned: true }).notNull(),
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
  unitPrice: bigint("unitPrice", { mode: "number", unsigned: true }).notNull(),
  quantity: int("quantity").notNull(),
  lineAmount: bigint("lineAmount", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

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

export const paymentPayerProfiles = mysqlTable(
  "paymentPayerProfiles",
  {
    id: int("id").autoincrement().primaryKey(),
    brandId: int("brandId").notNull(),
    userId: int("userId").notNull(),
    wechatOpenId: varchar("wechatOpenId", { length: 128 }),
    wechatUnionId: varchar("wechatUnionId", { length: 128 }),
    alipayBuyerId: varchar("alipayBuyerId", { length: 128 }),
    alipayOpenId: varchar("alipayOpenId", { length: 128 }),
    lastVerifiedAt: timestamp("lastVerifiedAt"),
    metaJson: json("metaJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    brandUserUnique: uniqueIndex("paymentPayerProfiles_brand_user_unique").on(table.brandId, table.userId),
  }),
);

export const paymentCallbackLogs = mysqlTable(
  "paymentCallbackLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    brandId: int("brandId").notNull(),
    paymentId: int("paymentId"),
    orderId: int("orderId"),
    provider: mysqlEnum("provider", ["wechat_jsapi", "wechat_native", "alipay", "stripe", "offline_bank_transfer"]).notNull(),
    callbackType: mysqlEnum("callbackType", ["payment_notify", "refund_notify", "manual_replay", "reconciliation"]).notNull(),
    providerEventId: varchar("providerEventId", { length: 128 }),
    providerTransactionId: varchar("providerTransactionId", { length: 128 }),
    signatureStatus: mysqlEnum("signatureStatus", ["pending", "verified", "failed", "skipped"]).notNull().default("pending"),
    processStatus: mysqlEnum("processStatus", ["received", "processed", "ignored", "failed"]).notNull().default("received"),
    retryCount: int("retryCount").notNull().default(0),
    requestHeadersJson: json("requestHeadersJson"),
    payloadText: text("payloadText"),
    processResultJson: json("processResultJson"),
    receivedAt: timestamp("receivedAt").defaultNow().notNull(),
    processedAt: timestamp("processedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => ({
    providerEventUnique: uniqueIndex("paymentCallbackLogs_provider_event_unique").on(table.provider, table.callbackType, table.providerEventId),
  }),
);

export const paymentRefunds = mysqlTable(
  "paymentRefunds",
  {
    id: int("id").autoincrement().primaryKey(),
    brandId: int("brandId").notNull(),
    orderId: int("orderId").notNull(),
    paymentId: int("paymentId").notNull(),
    refundNo: varchar("refundNo", { length: 64 }).notNull().unique(),
    provider: mysqlEnum("provider", ["wechat_jsapi", "wechat_native", "alipay", "stripe", "offline_bank_transfer"]).notNull(),
    amount: bigint("amount", { mode: "number", unsigned: true }).notNull(),
    currency: varchar("currency", { length: 16 }).notNull().default("CNY"),
    status: mysqlEnum("status", ["created", "pending", "succeeded", "failed", "cancelled", "closed"]).notNull().default("created"),
    reason: varchar("reason", { length: 255 }),
    providerRefundNo: varchar("providerRefundNo", { length: 128 }),
    requestedBy: int("requestedBy"),
    approvedBy: int("approvedBy"),
    requestedAt: timestamp("requestedAt").defaultNow().notNull(),
    approvedAt: timestamp("approvedAt"),
    settledAt: timestamp("settledAt"),
    metaJson: json("metaJson"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    paymentRefundUnique: uniqueIndex("paymentRefunds_payment_refund_unique").on(table.paymentId, table.refundNo),
  }),
);

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

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export type BrandMembership = typeof brandMemberships.$inferSelect;
export type InsertBrandMembership = typeof brandMemberships.$inferInsert;

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export type ProductSku = typeof productSkus.$inferSelect;
export type InsertProductSku = typeof productSkus.$inferInsert;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

export type PaymentPayerProfile = typeof paymentPayerProfiles.$inferSelect;
export type InsertPaymentPayerProfile = typeof paymentPayerProfiles.$inferInsert;

export type PaymentCallbackLog = typeof paymentCallbackLogs.$inferSelect;
export type InsertPaymentCallbackLog = typeof paymentCallbackLogs.$inferInsert;

export type PaymentRefund = typeof paymentRefunds.$inferSelect;
export type InsertPaymentRefund = typeof paymentRefunds.$inferInsert;

export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
