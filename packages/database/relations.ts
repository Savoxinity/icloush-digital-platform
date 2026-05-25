import { relations } from "drizzle-orm";

import {
  bankTransferReceipts,
  brandMemberships,
  brands,
  orderItems,
  orders,
  payments,
  productCategories,
  products,
  productSkus,
  skuTierPrices,
  users,
} from "./schema";

export const brandsRelations = relations(brands, ({ many }) => ({
  memberships: many(brandMemberships),
  categories: many(productCategories),
  products: many(products),
  skus: many(productSkus),
  orders: many(orders),
  payments: many(payments),
  receipts: many(bankTransferReceipts),
  tierPrices: many(skuTierPrices),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(brandMemberships),
  orders: many(orders),
}));

export const brandMembershipsRelations = relations(brandMemberships, ({ one }) => ({
  brand: one(brands, {
    fields: [brandMemberships.brandId],
    references: [brands.id],
  }),
  user: one(users, {
    fields: [brandMemberships.userId],
    references: [users.id],
  }),
}));

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  brand: one(brands, {
    fields: [productCategories.brandId],
    references: [brands.id],
  }),
  products: many(products),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  brand: one(brands, {
    fields: [products.brandId],
    references: [brands.id],
  }),
  category: one(productCategories, {
    fields: [products.categoryId],
    references: [productCategories.id],
  }),
  skus: many(productSkus),
  orderItems: many(orderItems),
}));

export const productSkusRelations = relations(productSkus, ({ one, many }) => ({
  brand: one(brands, {
    fields: [productSkus.brandId],
    references: [brands.id],
  }),
  product: one(products, {
    fields: [productSkus.productId],
    references: [products.id],
  }),
  tierPrices: many(skuTierPrices),
  orderItems: many(orderItems),
}));

export const skuTierPricesRelations = relations(skuTierPrices, ({ one }) => ({
  brand: one(brands, {
    fields: [skuTierPrices.brandId],
    references: [brands.id],
  }),
  sku: one(productSkus, {
    fields: [skuTierPrices.skuId],
    references: [productSkus.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  brand: one(brands, {
    fields: [orders.brandId],
    references: [brands.id],
  }),
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  membership: one(brandMemberships, {
    fields: [orders.membershipId],
    references: [brandMemberships.id],
  }),
  items: many(orderItems),
  payments: many(payments),
  receipts: many(bankTransferReceipts),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  brand: one(brands, {
    fields: [orderItems.brandId],
    references: [brands.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
  sku: one(productSkus, {
    fields: [orderItems.skuId],
    references: [productSkus.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one, many }) => ({
  brand: one(brands, {
    fields: [payments.brandId],
    references: [brands.id],
  }),
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
  receipts: many(bankTransferReceipts),
}));

export const bankTransferReceiptsRelations = relations(bankTransferReceipts, ({ one }) => ({
  brand: one(brands, {
    fields: [bankTransferReceipts.brandId],
    references: [brands.id],
  }),
  order: one(orders, {
    fields: [bankTransferReceipts.orderId],
    references: [orders.id],
  }),
  payment: one(payments, {
    fields: [bankTransferReceipts.paymentId],
    references: [payments.id],
  }),
}));
