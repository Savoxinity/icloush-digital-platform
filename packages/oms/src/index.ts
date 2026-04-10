import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bankTransferReceipts,
  brandMemberships,
  orderItems,
  orders,
  payments,
} from "../../database/schema";
import { priceOrderItems, type CustomerType } from "../../pim/src/index";

export type DatabaseClient = ReturnType<typeof drizzle>;
export type OrderStatus =
  | "pending_payment"
  | "under_review"
  | "paid"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled"
  | "closed";

export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["under_review", "paid", "cancelled", "closed"],
  under_review: ["pending_payment", "paid", "cancelled", "closed"],
  paid: ["processing", "completed", "closed"],
  processing: ["shipped", "completed", "closed"],
  shipped: ["completed", "closed"],
  completed: [],
  cancelled: [],
  closed: [],
};

const buildOrderNo = (brandId: number) =>
  `ORD-${brandId}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
const buildPaymentNo = (brandId: number) =>
  `PAY-${brandId}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const normalizeMetaJson = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const buildSkuLabel = (specName?: string | null, packSize?: string | null) =>
  [specName, packSize].filter(Boolean).join(" / ") || null;

const latestByCreatedAt = <T extends { createdAt: Date | null }>(rows: T[]) =>
  [...rows].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  })[0] ?? null;

const summarizeOrder = (args: {
  order: typeof orders.$inferSelect;
  items: Array<typeof orderItems.$inferSelect>;
  payments: Array<typeof payments.$inferSelect>;
  receipts: Array<typeof bankTransferReceipts.$inferSelect>;
}) => {
  const totalQuantity = args.items.reduce((sum, item) => sum + item.quantity, 0);
  const latestPayment = latestByCreatedAt(args.payments);
  const latestReceipt = latestByCreatedAt(args.receipts);

  return {
    ...args.order,
    totalQuantity,
    itemCount: args.items.length,
    itemPreview: args.items.slice(0, 3).map((item) => ({
      productName: item.productName,
      skuLabel: item.skuLabel,
      quantity: item.quantity,
      lineAmount: item.lineAmount,
    })),
    latestPayment,
    latestReceipt,
  };
};

export function assertOrderStatusTransition(current: OrderStatus, next: OrderStatus) {
  if (!ORDER_STATUS_TRANSITIONS[current]?.includes(next)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `订单状态不允许从 ${current} 变更到 ${next}。`,
    });
  }
}

export async function listOrders(args: {
  db: DatabaseClient;
  brandId: number;
  userId?: number;
  membershipId?: number;
  orderId?: number;
  orderNo?: string;
  status?: OrderStatus;
  paymentStatus?: typeof orders.$inferSelect.paymentStatus;
  fulfillmentStatus?: typeof orders.$inferSelect.fulfillmentStatus;
  limit?: number;
}) {
  const conditions = [eq(orders.brandId, args.brandId)];

  if (args.userId) {
    conditions.push(eq(orders.userId, args.userId));
  }

  if (args.membershipId) {
    conditions.push(eq(orders.membershipId, args.membershipId));
  }

  if (args.orderId) {
    conditions.push(eq(orders.id, args.orderId));
  }

  if (args.orderNo) {
    conditions.push(eq(orders.orderNo, args.orderNo));
  }

  if (args.status) {
    conditions.push(eq(orders.status, args.status));
  }

  if (args.paymentStatus) {
    conditions.push(eq(orders.paymentStatus, args.paymentStatus));
  }

  if (args.fulfillmentStatus) {
    conditions.push(eq(orders.fulfillmentStatus, args.fulfillmentStatus));
  }

  const matchedOrders = await args.db
    .select()
    .from(orders)
    .where(and(...conditions))
    .orderBy(desc(orders.createdAt))
    .limit(Math.min(args.limit ?? 20, 100));

  if (matchedOrders.length === 0) {
    return {
      total: 0,
      records: [],
    };
  }

  const orderIds = matchedOrders.map((order) => order.id);
  const [matchedItems, matchedPayments, matchedReceipts] = await Promise.all([
    args.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    args.db.select().from(payments).where(inArray(payments.orderId, orderIds)),
    args.db.select().from(bankTransferReceipts).where(inArray(bankTransferReceipts.orderId, orderIds)),
  ]);

  const records = matchedOrders.map((order) =>
    summarizeOrder({
      order,
      items: matchedItems.filter((item) => item.orderId === order.id),
      payments: matchedPayments.filter((payment) => payment.orderId === order.id),
      receipts: matchedReceipts.filter((receipt) => receipt.orderId === order.id),
    }),
  );

  return {
    total: records.length,
    records,
  };
}

export async function getOrderDetail(args: {
  db: DatabaseClient;
  brandId: number;
  orderId?: number;
  orderNo?: string;
}) {
  if (!args.orderId && !args.orderNo) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "查询订单详情时必须提供 orderId 或 orderNo。",
    });
  }

  const matched = await listOrders({
    db: args.db,
    brandId: args.brandId,
    orderId: args.orderId,
    orderNo: args.orderNo,
    limit: 1,
  });

  const summary = matched.records[0];
  if (!summary) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在。",
    });
  }

  const [items, paymentRows, receiptRows] = await Promise.all([
    args.db.select().from(orderItems).where(eq(orderItems.orderId, summary.id)),
    args.db.select().from(payments).where(eq(payments.orderId, summary.id)),
    args.db.select().from(bankTransferReceipts).where(eq(bankTransferReceipts.orderId, summary.id)),
  ]);

  return {
    summary,
    items,
    payments: paymentRows,
    receipts: receiptRows,
  };
}

export async function listOrderReviewQueue(args: {
  db: DatabaseClient;
  brandId: number;
  reviewStatus?: typeof bankTransferReceipts.$inferSelect.reviewStatus;
  orderId?: number;
  orderNo?: string;
  paymentId?: number;
  receiptId?: number;
  reviewedBy?: number;
  limit?: number;
}) {
  const receiptConditions = [eq(bankTransferReceipts.brandId, args.brandId)];

  if (args.reviewStatus) {
    receiptConditions.push(eq(bankTransferReceipts.reviewStatus, args.reviewStatus));
  }

  if (args.orderId) {
    receiptConditions.push(eq(bankTransferReceipts.orderId, args.orderId));
  }

  if (args.paymentId) {
    receiptConditions.push(eq(bankTransferReceipts.paymentId, args.paymentId));
  }

  if (args.receiptId) {
    receiptConditions.push(eq(bankTransferReceipts.id, args.receiptId));
  }

  if (args.reviewedBy) {
    receiptConditions.push(eq(bankTransferReceipts.reviewedBy, args.reviewedBy));
  }

  const matchedReceipts = await args.db
    .select()
    .from(bankTransferReceipts)
    .where(and(...receiptConditions))
    .orderBy(desc(bankTransferReceipts.createdAt))
    .limit(Math.min(args.limit ?? 20, 100));

  if (matchedReceipts.length === 0) {
    return {
      total: 0,
      records: [],
    };
  }

  const orderIds = [...new Set(matchedReceipts.map((receipt) => receipt.orderId))];
  const [matchedOrders, matchedItems, matchedPayments] = await Promise.all([
    args.db.select().from(orders).where(inArray(orders.id, orderIds)),
    args.db.select().from(orderItems).where(inArray(orderItems.orderId, orderIds)),
    args.db.select().from(payments).where(inArray(payments.orderId, orderIds)),
  ]);

  const orderById = new Map(matchedOrders.map((order) => [order.id, order]));

  const records = matchedReceipts
    .map((receipt) => {
      const order = orderById.get(receipt.orderId);
      if (!order || (args.orderNo && order.orderNo !== args.orderNo)) {
        return null;
      }

      const relatedItems = matchedItems.filter((item) => item.orderId === order.id);
      const relatedPayments = matchedPayments.filter((payment) => payment.orderId === order.id);
      const matchedPayment = receipt.paymentId
        ? relatedPayments.find((payment) => payment.id === receipt.paymentId) ?? latestByCreatedAt(relatedPayments)
        : latestByCreatedAt(relatedPayments);

      return {
        order: summarizeOrder({
          order,
          items: relatedItems,
          payments: relatedPayments,
          receipts: matchedReceipts.filter((candidate) => candidate.orderId === order.id),
        }),
        payment: matchedPayment ?? null,
        receipt,
        reviewStatus: receipt.reviewStatus,
        reviewStage:
          receipt.reviewStatus === "pending"
            ? "awaiting_finance_review"
            : receipt.reviewStatus === "approved"
              ? "approved"
              : "rejected",
      };
    })
    .filter((record): record is NonNullable<typeof record> => Boolean(record));

  return {
    total: records.length,
    records,
  };
}

export async function createOrder(args: {
  db: DatabaseClient;
  brandId: number;
  userId: number;
  customerType?: CustomerType;
  membershipId?: number | null;
  note?: string | null;
  items: Array<{
    productId: number;
    skuId: number;
    quantity: number;
  }>;
  payment?: {
    provider?: "wechat_jsapi" | "offline_bank_transfer" | "alipay";
    paymentScenario?: "full_payment" | "installment" | "credit_card" | "deposit" | "offline_review";
    installmentPlanCode?: string | null;
    allowCreditCard?: boolean;
    payerOpenId?: string | null;
  };
}) {
  if (args.items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "订单至少需要包含一个商品项。",
    });
  }

  if (args.membershipId) {
    const membership = await args.db
      .select()
      .from(brandMemberships)
      .where(
        and(
          eq(brandMemberships.id, args.membershipId),
          eq(brandMemberships.brandId, args.brandId),
          eq(brandMemberships.userId, args.userId),
        ),
      )
      .limit(1);

    if (!membership[0]) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "当前用户不是该品牌的有效成员，不能以 B2B 会员身份下单。",
      });
    }
  }

  const customerType: CustomerType = args.customerType ?? (args.membershipId ? "b2b" : "b2c");
  const pricing = await priceOrderItems({
    db: args.db,
    brandId: args.brandId,
    customerType,
    items: args.items,
  });

  const provider = args.payment?.provider ?? "offline_bank_transfer";
  const paymentScenario =
    args.payment?.paymentScenario ?? (provider === "offline_bank_transfer" ? "offline_review" : "full_payment");

  return args.db.transaction(async (tx) => {
    const orderNo = buildOrderNo(args.brandId);
    const createdOrder = await tx
      .insert(orders)
      .values({
        brandId: args.brandId,
        userId: args.userId,
        membershipId: args.membershipId ?? null,
        orderNo,
        orderType: customerType === "b2b" ? "b2b_purchase" : "b2c_purchase",
        channel: "web",
        status: "pending_payment",
        paymentStatus: "unpaid",
        fulfillmentStatus: "unfulfilled",
        currency: "CNY",
        subtotalAmount: pricing.subtotalAmount,
        discountAmount: 0,
        shippingAmount: 0,
        payableAmount: pricing.subtotalAmount,
        note: args.note ?? null,
      })
      .$returningId();

    const orderId = createdOrder[0].id;

    await tx.insert(orderItems).values(
      pricing.pricedItems.map((priced) => ({
        orderId,
        brandId: args.brandId,
        productId: priced.product.id,
        skuId: priced.sku.id,
        productName: priced.product.name,
        skuLabel: buildSkuLabel(priced.sku.specName, priced.sku.packSize),
        unitPrice: priced.unitPrice,
        quantity: priced.item.quantity,
        lineAmount: priced.lineAmount,
      })),
    );

    const insertedPayment = await tx
      .insert(payments)
      .values({
        brandId: args.brandId,
        orderId,
        paymentNo: buildPaymentNo(args.brandId),
        provider,
        paymentScenario,
        amount: pricing.subtotalAmount,
        status: "created",
        metaJson: {
          installmentPlanCode: args.payment?.installmentPlanCode ?? null,
          allowCreditCard: args.payment?.allowCreditCard ?? false,
          payerOpenId: args.payment?.payerOpenId ?? null,
        },
      })
      .$returningId();

    const orderRows = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const paymentRows = await tx.select().from(payments).where(eq(payments.id, insertedPayment[0].id)).limit(1);

    return {
      order: orderRows[0],
      items: pricing.pricedItems,
      payment: paymentRows[0],
    };
  });
}

export async function reviewOrderPayment(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId?: number;
  receiptId?: number;
  approved: boolean;
  reviewedBy?: number | null;
  reviewNote?: string | null;
}) {
  const matchedOrder = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  const order = matchedOrder[0];
  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在，无法执行审核。",
    });
  }

  const matchedPayment = (
    await args.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.brandId, args.brandId),
          eq(payments.orderId, order.id),
          args.paymentId ? eq(payments.id, args.paymentId) : eq(payments.provider, "offline_bank_transfer"),
        ),
      )
      .limit(1)
  )[0];

  if (!matchedPayment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "未找到待审核的支付记录。",
    });
  }

  const matchedReceipt = args.receiptId
    ? (
        await args.db
          .select()
          .from(bankTransferReceipts)
          .where(
            and(
              eq(bankTransferReceipts.id, args.receiptId),
              eq(bankTransferReceipts.brandId, args.brandId),
              eq(bankTransferReceipts.orderId, order.id),
            ),
          )
          .limit(1)
      )[0]
    : (
        await args.db
          .select()
          .from(bankTransferReceipts)
          .where(
            and(
              eq(bankTransferReceipts.brandId, args.brandId),
              eq(bankTransferReceipts.orderId, order.id),
              eq(bankTransferReceipts.paymentId, matchedPayment.id),
            ),
          )
          .limit(1)
      )[0];

  if (!matchedReceipt) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "未找到待审核的转账凭证。",
    });
  }

  const nextOrderStatus: OrderStatus = args.approved ? "paid" : "pending_payment";
  assertOrderStatusTransition(order.status as OrderStatus, nextOrderStatus);

  return args.db.transaction(async (tx) => {
    await tx
      .update(bankTransferReceipts)
      .set({
        reviewStatus: args.approved ? "approved" : "rejected",
        reviewedBy: args.reviewedBy ?? null,
        reviewedAt: new Date(),
      })
      .where(eq(bankTransferReceipts.id, matchedReceipt.id));

    await tx
      .update(payments)
      .set({
        status: args.approved ? "paid" : "failed",
        paidAt: args.approved ? new Date() : null,
        metaJson: {
          ...normalizeMetaJson(matchedPayment.metaJson),
          reviewedBy: args.reviewedBy ?? null,
          reviewNote: args.reviewNote ?? null,
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, matchedPayment.id));

    await tx
      .update(orders)
      .set({
        status: nextOrderStatus,
        paymentStatus: args.approved ? "paid" : "unpaid",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const orderRows = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    const paymentRows = await tx.select().from(payments).where(eq(payments.id, matchedPayment.id)).limit(1);
    const receiptRows = await tx
      .select()
      .from(bankTransferReceipts)
      .where(eq(bankTransferReceipts.id, matchedReceipt.id))
      .limit(1);

    return {
      order: orderRows[0],
      payment: paymentRows[0],
      receipt: receiptRows[0],
      review: {
        approved: args.approved,
        reviewedBy: args.reviewedBy ?? null,
        reviewNote: args.reviewNote ?? null,
      },
    };
  });
}
