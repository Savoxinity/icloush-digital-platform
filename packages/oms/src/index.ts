import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bankTransferReceipts, brandMemberships, orderItems, orders, payments } from "../../database/schema";
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

export function assertOrderStatusTransition(current: OrderStatus, next: OrderStatus) {
  if (!ORDER_STATUS_TRANSITIONS[current]?.includes(next)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `订单状态不允许从 ${current} 变更到 ${next}。`,
    });
  }
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
