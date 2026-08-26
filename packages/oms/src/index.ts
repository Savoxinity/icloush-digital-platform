import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  bankTransferReceipts,
  brandMemberships,
  orderItems,
  orders,
  paymentCallbackLogs,
  payments,
  productComponents,
  products,
  productSkus,
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

type CommerceProductType = "physical" | "service" | "rental" | "subscription";
type ResolvedOrderType = "b2b_purchase" | "b2c_purchase" | "service" | "rental" | "subscription";
export type SupportedOrderCurrency = "CNY" | "USD";
export type CustomSkuComponentSelection = {
  componentId: number;
};

export type Un1266LogisticsInput = {
  fulfillmentMethod?: "ground_delivery" | "instant_pickup" | null;
  recipientRegion?: string | null;
  addressLine?: string | null;
};

export type Un1266LogisticsDecision = {
  material: "UN1266";
  requiresComplianceRouting: boolean;
  dispatchMode: "standard_dispatch" | "hazmat_ground_delivery" | "compliance_warehouse_dispatch";
  reasons: string[];
  notice: string;
};

const AIR_TRANSPORT_RESTRICTED_TOKENS = ["机场", "空港", "航站楼", "航空", "机场货运", "机场物流"];

export function resolveUn1266LogisticsCompliance(input?: Un1266LogisticsInput | null): Un1266LogisticsDecision {
  const addressText = `${input?.recipientRegion ?? ""} ${input?.addressLine ?? ""}`.toLowerCase();
  const airRestricted = AIR_TRANSPORT_RESTRICTED_TOKENS.some((token) => addressText.includes(token));
  const instantPickup = input?.fulfillmentMethod === "instant_pickup";
  const reasons = [
    ...(airRestricted ? ["收货地址命中航空禁运/机场物流区域关键词"] : []),
    ...(instantPickup ? ["用户选择即时自提，需要转由合规仓确认危化品交接条件"] : []),
  ];
  if (airRestricted) {
    return {
      material: "UN1266",
      requiresComplianceRouting: true,
      dispatchMode: "hazmat_ground_delivery",
      reasons,
      notice: "该订单含 UN1266 易燃液体，收货区域不进入航空链路；系统将切换至危化品陆运并由合规仓确认派送。",
    };
  }
  if (instantPickup) {
    return {
      material: "UN1266",
      requiresComplianceRouting: true,
      dispatchMode: "compliance_warehouse_dispatch",
      reasons,
      notice: "该订单含 UN1266 易燃液体，即时自提需由合规仓确认交接条件；系统不会安排普通即时取件。",
    };
  }
  return {
    material: "UN1266",
    requiresComplianceRouting: false,
    dispatchMode: "standard_dispatch",
    reasons: [],
    notice: "该订单含 UN1266 易燃液体；默认按合规地面配送规则处理，不进入航空运输链路。",
  };
}

function resolveOrderCurrency(currency?: string | null): SupportedOrderCurrency {
  if (!currency) return "CNY";
  if (currency === "CNY" || currency === "USD") return currency;
  throw new TRPCError({
    code: "BAD_REQUEST",
    message: "当前订单仅支持 CNY 或 USD 结算。",
  });
}

function resolveOrderTypeFromProductTypes(productTypes: CommerceProductType[], customerType: CustomerType): ResolvedOrderType {
  const uniqueProductTypes = Array.from(new Set(productTypes));

  if (uniqueProductTypes.length === 0) {
    return customerType === "b2b" ? "b2b_purchase" : "b2c_purchase";
  }

  if (uniqueProductTypes.length > 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "当前订单暂不支持将实物、服务、订阅或租赁商品混合结算，请按单一商品类型分别创建订单。",
    });
  }

  const [productType] = uniqueProductTypes;
  if (productType === "subscription" || productType === "service" || productType === "rental") {
    return productType;
  }

  return customerType === "b2b" ? "b2b_purchase" : "b2c_purchase";
}

function orderTypeRequiresInventoryReservation(orderType: ResolvedOrderType) {
  return orderType === "b2b_purchase" || orderType === "b2c_purchase";
}

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

const appendOrderNote = (currentNote: string | null | undefined, lines: string[]) => {
  const normalizedCurrent = currentNote?.trim() ?? "";
  const normalizedLines = lines.map((line) => line.trim()).filter(Boolean);
  if (normalizedLines.length === 0) {
    return normalizedCurrent || null;
  }
  return [normalizedCurrent, ...normalizedLines].filter(Boolean).join("\n");
};

const buildSkuLabel = (specName?: string | null, packSize?: string | null) =>
  [specName, packSize].filter(Boolean).join(" / ") || null;

const latestByCreatedAt = <T extends { createdAt: Date | null }>(rows: T[]) =>
  [...rows].sort((left, right) => {
    const leftTime = left.createdAt ? new Date(left.createdAt).getTime() : 0;
    const rightTime = right.createdAt ? new Date(right.createdAt).getTime() : 0;
    return rightTime - leftTime;
  })[0] ?? null;

async function lockInventoryRowsForUpdate(args: {
  tx: DatabaseClient | { execute?: (query: unknown) => Promise<unknown> };
  brandId: number;
  skuIds: number[];
}) {
  const uniqueSkuIds = Array.from(new Set(args.skuIds)).sort((left, right) => left - right);
  if (uniqueSkuIds.length === 0) {
    return {
      lockMode: "skipped" as const,
      lockedSkuIds: uniqueSkuIds,
    };
  }

  const executableTx = args.tx as { execute?: (query: unknown) => Promise<unknown> };
  if (typeof executableTx.execute !== "function") {
    return {
      lockMode: "skipped" as const,
      lockedSkuIds: uniqueSkuIds,
    };
  }

  await executableTx.execute(sql`
    SELECT ${productSkus.id}
    FROM ${productSkus}
    WHERE ${and(eq(productSkus.brandId, args.brandId), inArray(productSkus.id, uniqueSkuIds))}
    FOR UPDATE
  `);

  return {
    lockMode: "for_update" as const,
    lockedSkuIds: uniqueSkuIds,
  };
}

export type SandboxPaymentOutcome = "successful" | "closed";

const sandboxSettlementTimers = new Map<string, ReturnType<typeof setTimeout>>();

const buildSandboxSettlementKey = (brandId: number, orderId: number, paymentId: number) =>
  `${brandId}:${orderId}:${paymentId}`;

const clampSandboxDelay = (delayMs?: number) => {
  if (typeof delayMs !== "number" || Number.isNaN(delayMs)) {
    return 6_000;
  }
  return Math.min(Math.max(Math.round(delayMs), 5_000), 10_000);
};

export async function settleSandboxOrderPayment(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId: number;
  outcome?: SandboxPaymentOutcome;
}) {
  const outcome = args.outcome ?? "successful";
  const [order] = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "沙盒支付推进失败：订单不存在。",
    });
  }

  const [payment] = await args.db
    .select()
    .from(payments)
    .where(and(eq(payments.id, args.paymentId), eq(payments.orderId, args.orderId), eq(payments.brandId, args.brandId)))
    .limit(1);

  if (!payment) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "沙盒支付推进失败：支付记录不存在。",
    });
  }

  if (order.paymentStatus === "paid" || order.status === "paid" || order.status === "closed" || order.status === "cancelled") {
    return {
      order,
      payment,
      skipped: true,
      outcome,
    };
  }

  const nextOrderStatus: OrderStatus = outcome === "successful" ? "paid" : "closed";
  assertOrderStatusTransition(order.status as OrderStatus, nextOrderStatus);

  return args.db.transaction(async (tx) => {
    const settledAt = new Date();
    const settledAtIso = settledAt.toISOString();

    await tx
      .update(payments)
      .set({
        status: outcome === "successful" ? "paid" : "cancelled",
        paidAt: outcome === "successful" ? settledAt : null,
        metaJson: {
          ...normalizeMetaJson(payment.metaJson),
          sandboxOutcome: outcome,
          sandboxSettledAt: settledAtIso,
        },
        updatedAt: settledAt,
      })
      .where(eq(payments.id, payment.id));

    await tx
      .update(orders)
      .set({
        status: nextOrderStatus,
        paymentStatus: outcome === "successful" ? "paid" : "unpaid",
        updatedAt: settledAt,
      })
      .where(eq(orders.id, order.id));

    if (typeof (tx as { insert?: unknown }).insert === "function") {
      await ((tx as unknown) as DatabaseClient)
        .insert(paymentCallbackLogs)
        .values({
          brandId: args.brandId,
          paymentId: payment.id,
          orderId: order.id,
          provider: payment.provider,
          callbackType: "payment_notify",
          providerEventId: `sandbox:${args.brandId}:${order.id}:${payment.id}:${outcome}:${settledAt.getTime()}`,
          providerTransactionId: `sandbox-${payment.id}-${outcome}`,
          signatureStatus: "skipped",
          processStatus: "processed",
          payloadText: JSON.stringify({
            sandbox: true,
            outcome,
            brandId: args.brandId,
            orderId: order.id,
            paymentId: payment.id,
          }),
          processResultJson: {
            sandbox: true,
            outcome,
            nextOrderStatus,
          },
          processedAt: settledAt,
          receivedAt: settledAt,
          createdAt: settledAt,
        });
    }

    const [nextOrder] = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    const [nextPayment] = await tx.select().from(payments).where(eq(payments.id, payment.id)).limit(1);

    return {
      order: nextOrder,
      payment: nextPayment,
      skipped: false,
      outcome,
    };
  });
}

export function scheduleSandboxOrderPaymentSettlement(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId: number;
  delayMs?: number;
  outcome?: SandboxPaymentOutcome;
}) {
  const key = buildSandboxSettlementKey(args.brandId, args.orderId, args.paymentId);
  const existing = sandboxSettlementTimers.get(key);
  if (existing) {
    clearTimeout(existing);
  }

  const delay = clampSandboxDelay(args.delayMs);
  const timeout = setTimeout(() => {
    sandboxSettlementTimers.delete(key);
    void settleSandboxOrderPayment({
      db: args.db,
      brandId: args.brandId,
      orderId: args.orderId,
      paymentId: args.paymentId,
      outcome: args.outcome,
    }).catch((error) => {
      console.error("[oms] sandbox payment settlement failed", {
        brandId: args.brandId,
        orderId: args.orderId,
        paymentId: args.paymentId,
        error,
      });
    });
  }, delay);

  sandboxSettlementTimers.set(key, timeout);

  return {
    scheduled: true,
    key,
    delayMs: delay,
    outcome: args.outcome ?? "successful",
  };
}

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

  const orderIds = Array.from(new Set(matchedReceipts.map((receipt) => receipt.orderId)));
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
  currency?: SupportedOrderCurrency;
  customization?: {
    components: CustomSkuComponentSelection[];
  } | null;
  logistics?: Un1266LogisticsInput | null;
  items: Array<{
    productId: number;
    skuId: number;
    quantity: number;
  }>;
  payment?: {
    provider?: "wechat_jsapi" | "offline_bank_transfer" | "alipay";
    gateway?: "wechat_pay_v3" | "alipay_openapi" | null;
    paymentMode?: "sandbox" | "production_ready" | "production_live" | null;
    paymentScenario?: "full_payment" | "installment" | "credit_card" | "deposit" | "offline_review";
    installmentPlanCode?: string | null;
    allowCreditCard?: boolean;
    payerOpenId?: string | null;
  };
  sandbox?: {
    autoSettle?: boolean;
    delayMs?: number;
    outcome?: SandboxPaymentOutcome;
  };
}) {
  if (args.items.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "订单至少需要包含一个商品项。",
    });
  }

  const currency = resolveOrderCurrency(args.currency);
  const selectedComponentIds = args.customization?.components.map((component) => component.componentId) ?? [];
  if (selectedComponentIds.length > 0 && (args.items.length !== 1 || args.items[0]?.quantity !== 1)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "灯笼定制订单当前仅支持单件单 SKU 结算。",
    });
  }
  if (selectedComponentIds.length > 0 && new Set(selectedComponentIds).size !== selectedComponentIds.length) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "同一灯笼组件不能被重复选择。",
    });
  }
  const logisticsCompliance = resolveUn1266LogisticsCompliance(args.logistics);
  const orderNote = [args.note?.trim(), logisticsCompliance.requiresComplianceRouting ? `[UN1266] ${logisticsCompliance.notice}` : null]
    .filter((entry): entry is string => Boolean(entry))
    .join("\n") || null;

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
  const requestedQtyBySku = pricing.pricedItems.reduce(
    (accumulator, priced) => {
      const currentQty = accumulator.get(priced.sku.id) ?? 0;
      accumulator.set(priced.sku.id, currentQty + priced.item.quantity);
      return accumulator;
    },
    new Map<number, number>(),
  );

  const result = await args.db.transaction(async (tx) => {
    const orderNo = buildOrderNo(args.brandId);
    const productIds = Array.from(new Set(pricing.pricedItems.map((priced) => priced.product.id)));
    const productRows = await tx
      .select({
        id: products.id,
        code: products.code,
        name: products.name,
        productType: products.productType,
        priceUsd: products.priceUsd,
      })
      .from(products)
      .where(and(eq(products.brandId, args.brandId), inArray(products.id, productIds)));
    const productById = new Map(productRows.map((product) => [product.id, product]));

    for (const priced of pricing.pricedItems) {
      if (!productById.get(priced.product.id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `商品 ${priced.product.id} 不存在或不属于当前品牌。`,
        });
      }
      const product = productById.get(priced.product.id)!;
      const isBingzhuPreparedFragrance = product.code?.startsWith("BZ-") && product.code !== "BZ-LANTERN-CUSTOM";
      if (isBingzhuPreparedFragrance && !["15ml", "50ml"].includes(priced.sku.packSize ?? "")) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "BINGZHU 预制香水当前仅提供 15ml 或 50ml 规格。",
        });
      }
    }

    const resolvedOrderType = resolveOrderTypeFromProductTypes(
      pricing.pricedItems.map((priced) => productById.get(priced.product.id)?.productType ?? "physical"),
      customerType,
    );

    const currencyPricedItems = pricing.pricedItems.map((priced) => {
      if (currency === "CNY") return priced;
      const priceUsd = priced.sku.priceUsd ?? productById.get(priced.product.id)?.priceUsd;
      if (priceUsd === null || priceUsd === undefined) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `${priced.product.name} 尚未配置 USD 价格，暂不能使用美元结算。`,
        });
      }
      return { ...priced, unitPrice: priceUsd, lineAmount: priceUsd * priced.item.quantity, matchedTier: null };
    });

    let customizationJson: Record<string, unknown> | null = null;
    let customizationSurcharge = 0;
    if (selectedComponentIds.length > 0) {
      const components = await tx
        .select()
        .from(productComponents)
        .where(
          and(
            eq(productComponents.brandId, args.brandId),
            inArray(productComponents.id, selectedComponentIds),
            eq(productComponents.status, "active"),
          ),
        );
      if (components.length !== selectedComponentIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "选配组件不存在、已下架，或不属于当前品牌。" });
      }
      const requiredTypes = ["HEAD", "BODY_WRAP", "BASE"] as const;
      const componentTypes = new Set(components.map((component) => component.type));
      if (components.length !== requiredTypes.length || requiredTypes.some((type) => !componentTypes.has(type))) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "灯笼定制必须各选择一个 HEAD、BODY_WRAP 与 BASE 组件。" });
      }
      customizationSurcharge = components.reduce((sum, component) => {
        const componentPrice = currency === "USD" ? component.extraPriceUsd : component.extraPrice;
        if (componentPrice === null || componentPrice === undefined) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${component.name} 尚未配置 ${currency} 附加价，暂不能按当前币种结算。`,
          });
        }
        return sum + componentPrice;
      }, 0);
      customizationJson = {
        kind: "bingzhu_lantern",
        components: components.map((component) => ({
          id: component.id,
          type: component.type,
          name: component.name,
          material: component.material,
          extraPrice: component.extraPrice,
          extraPriceUsd: component.extraPriceUsd,
        })),
      };
    }
    const merchandiseSubtotal = currencyPricedItems.reduce((sum, priced) => sum + priced.lineAmount, 0);
    const payableAmount = merchandiseSubtotal + customizationSurcharge;

    if (orderTypeRequiresInventoryReservation(resolvedOrderType)) {
      const skuIds = Array.from(requestedQtyBySku.keys());
      // 在支持原生 SQL 的 MySQL 事务里，先用 `FOR UPDATE` 锁住对应 SKU 行，
      // 让高并发下的零售建单优先串行化到同一批库存记录；若运行环境或测试桩不支持 execute，
      // 仍会退回到下面的条件更新 + affectedRows 校验，保持最小可用的防超卖保护。
      await lockInventoryRowsForUpdate({
        tx: (tx as unknown) as DatabaseClient,
        brandId: args.brandId,
        skuIds,
      });
      const skuRows = await tx
        .select()
        .from(productSkus)
        .where(and(eq(productSkus.brandId, args.brandId), inArray(productSkus.id, skuIds)));
      const skuStockById = new Map(skuRows.map((sku) => [sku.id, sku]));

      for (const priced of pricing.pricedItems) {
        const matchedSku = skuStockById.get(priced.sku.id);
        if (!matchedSku) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `SKU ${priced.sku.id} 不存在或不属于当前品牌。`,
          });
        }
      }

      for (const [skuId, requestedQty] of Array.from(requestedQtyBySku.entries())) {
        const matchedSku = skuStockById.get(skuId);
        const sampleItem = pricing.pricedItems.find((priced) => priced.sku.id === skuId);
        if (!matchedSku || !sampleItem) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `SKU ${skuId} 不存在或不属于当前品牌。`,
          });
        }
        if (matchedSku.stockQty < requestedQty) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `${sampleItem.product.name} 库存不足，当前可售 ${matchedSku.stockQty}，请求 ${requestedQty}。`,
          });
        }
      }

      for (const [skuId, requestedQty] of Array.from(requestedQtyBySku.entries())) {
        const matchedSku = skuStockById.get(skuId)!;
        // 这里使用“读取到的旧 stockQty 仍然相等”作为条件更新的一部分，
        // 本质上是最小可用的乐观并发保护：若同一时刻其他订单已占用库存，affectedRows 会变成 0，
        // 从而阻止基于过期库存快照的重复扣减，避免仅靠预检造成的超卖。
        const inventoryUpdate = await tx
          .update(productSkus)
          .set({
            stockQty: matchedSku.stockQty - requestedQty,
          })
          .where(and(eq(productSkus.id, skuId), eq(productSkus.brandId, args.brandId), eq(productSkus.stockQty, matchedSku.stockQty)));
        const affectedRows = Number(
          (inventoryUpdate as { affectedRows?: number; rowsAffected?: number; changedRows?: number } | undefined)?.affectedRows
            ?? (inventoryUpdate as { affectedRows?: number; rowsAffected?: number; changedRows?: number } | undefined)?.rowsAffected
            ?? (inventoryUpdate as { affectedRows?: number; rowsAffected?: number; changedRows?: number } | undefined)?.changedRows
            ?? 0,
        );

        if (affectedRows < 1) {
          const sampleItem = pricing.pricedItems.find((priced) => priced.sku.id === skuId);
          throw new TRPCError({
            code: "CONFLICT",
            message: `${sampleItem?.product.name ?? `SKU ${skuId}`} 库存已被其他订单占用，请刷新后重试。`,
          });
        }
      }
    }

    const createdOrder = await tx
      .insert(orders)
      .values({
        brandId: args.brandId,
        userId: args.userId,
        membershipId: args.membershipId ?? null,
        orderNo,
        orderType: resolvedOrderType,
        channel: "web",
        status: "pending_payment",
        paymentStatus: "unpaid",
        fulfillmentStatus: "unfulfilled",
        currency,
        subtotalAmount: payableAmount,
        discountAmount: 0,
        shippingAmount: 0,
        payableAmount,
        note: orderNote,
        logisticsJson: {
          input: args.logistics ?? null,
          compliance: logisticsCompliance,
        },
      })
      .$returningId();

    const orderId = createdOrder[0].id;

    await tx.insert(orderItems).values(
      currencyPricedItems.map((priced, index) => ({
        orderId,
        brandId: args.brandId,
        productId: priced.product.id,
        skuId: priced.sku.id,
        productName: priced.product.name,
        skuLabel: buildSkuLabel(priced.sku.specName, priced.sku.packSize),
        customizationJson: index === 0 ? customizationJson : null,
        unitPrice: priced.unitPrice + (index === 0 ? customizationSurcharge : 0),
        quantity: priced.item.quantity,
        lineAmount: priced.lineAmount + (index === 0 ? customizationSurcharge : 0),
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
        amount: payableAmount,
        status: "created",
        metaJson: {
          paymentGateway: args.payment?.gateway ?? null,
          paymentMode: args.payment?.paymentMode ?? (args.sandbox?.autoSettle ? "sandbox" : null),
          installmentPlanCode: args.payment?.installmentPlanCode ?? null,
          allowCreditCard: args.payment?.allowCreditCard ?? false,
          payerOpenId: args.payment?.payerOpenId ?? null,
          currency,
          customization: customizationJson,
          logisticsCompliance,
          sandboxAutoSettle: args.sandbox?.autoSettle ?? false,
          sandboxOutcome: args.sandbox?.outcome ?? null,
        },
      })
      .$returningId();

    const orderRows = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    const paymentRows = await tx.select().from(payments).where(eq(payments.id, insertedPayment[0].id)).limit(1);

    return {
      order: orderRows[0],
      items: currencyPricedItems.map((priced, index) => ({
        ...priced,
        unitPrice: priced.unitPrice + (index === 0 ? customizationSurcharge : 0),
        lineAmount: priced.lineAmount + (index === 0 ? customizationSurcharge : 0),
        customization: index === 0 ? customizationJson : null,
      })),
      payment: paymentRows[0],
      logisticsCompliance,
    };
  });

  if (args.sandbox?.autoSettle && result.payment.provider !== "offline_bank_transfer") {
    scheduleSandboxOrderPaymentSettlement({
      db: args.db,
      brandId: args.brandId,
      orderId: result.order.id,
      paymentId: result.payment.id,
      delayMs: args.sandbox.delayMs,
      outcome: args.sandbox.outcome,
    });
  }

  return result;
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

export async function advanceOrderToProcessing(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
}) {
  const [order] = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在。",
    });
  }

  if (order.status !== "paid") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "仅已支付订单可推进到处理中。",
    });
  }

  assertOrderStatusTransition(order.status as OrderStatus, "processing");

  return args.db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "processing",
        fulfillmentStatus: "processing",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const orderRows = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return {
      order: orderRows[0],
    };
  });
}

export async function shipOrder(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  trackingNo: string;
}) {
  const [order] = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在。",
    });
  }

  if (order.status !== "processing") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "仅处理中订单可执行发货。",
    });
  }

  assertOrderStatusTransition(order.status as OrderStatus, "shipped");

  const shippedAt = new Date();
  const nextNote = appendOrderNote(order.note, [
    `虚拟物流单号：${args.trackingNo}`,
    `发货时间：${shippedAt.toISOString()}`,
  ]);

  return args.db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "shipped",
        fulfillmentStatus: "shipped",
        note: nextNote,
        updatedAt: shippedAt,
      })
      .where(eq(orders.id, order.id));

    const orderRows = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return {
      order: orderRows[0],
      trackingNo: args.trackingNo,
    };
  });
}

export async function completeOrder(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
}) {
  const [order] = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在。",
    });
  }

  if (order.status !== "shipped") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "仅已发货订单可推进到已完成。",
    });
  }

  assertOrderStatusTransition(order.status as OrderStatus, "completed");

  return args.db.transaction(async (tx) => {
    await tx
      .update(orders)
      .set({
        status: "completed",
        fulfillmentStatus: "delivered",
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const orderRows = await tx.select().from(orders).where(eq(orders.id, order.id)).limit(1);
    return {
      order: orderRows[0],
    };
  });
}

function resolvePaymentProviderFromGateway(gateway: "wechat_pay_v3" | "alipay_openapi") {
  return gateway === "wechat_pay_v3" ? "wechat_jsapi" : "alipay";
}

function isSuccessfulGatewayEvent(eventType?: string | null) {
  if (!eventType) {
    return false;
  }

  const normalized = eventType.trim().toUpperCase();
  return (
    normalized.includes("SUCCESS")
    || normalized.includes("PAID")
    || normalized.includes("TRANSACTION.SUCCESS")
    || normalized.includes("TRADE_SUCCESS")
  );
}

export async function recordGatewayPaymentCallback(args: {
  db: DatabaseClient;
  gateway: "wechat_pay_v3" | "alipay_openapi";
  orderNo?: string | null;
  eventType?: string | null;
  providerOrderId?: string | null;
  amount?: number | null;
  rawBody: string;
  headers?: Record<string, unknown> | null;
  verified: boolean;
  signatureStatus: "pending" | "verified" | "failed" | "skipped";
  stage?: string | null;
  responseStatus?: number | null;
  notes?: string[];
}) {
  const provider = resolvePaymentProviderFromGateway(args.gateway);
  const orderNo = typeof args.orderNo === "string" && args.orderNo.trim().length > 0 ? args.orderNo.trim() : null;
  const matchedOrder = orderNo
    ? (await args.db.select().from(orders).where(eq(orders.orderNo, orderNo)).limit(1))[0] ?? null
    : null;
  const matchedPayment = matchedOrder
    ? (
        await args.db
          .select()
          .from(payments)
          .where(and(eq(payments.brandId, matchedOrder.brandId), eq(payments.orderId, matchedOrder.id)))
          .orderBy(desc(payments.id))
          .limit(1)
      )[0] ?? null
    : null;

  if (!matchedOrder || !matchedPayment) {
    return {
      accepted: false,
      matched: false,
      orderNo,
      paymentId: null,
      orderId: matchedOrder?.id ?? null,
      notes: [
        "未能根据回调中的订单号定位到订单或支付记录，当前仅返回诊断结果。",
        ...(args.notes ?? []),
      ],
    };
  }

  const shouldMarkPaid = args.verified && isSuccessfulGatewayEvent(args.eventType);
  const processStatus = shouldMarkPaid ? "processed" : args.verified ? "ignored" : "received";
  const processResultJson = {
    gateway: args.gateway,
    stage: args.stage ?? null,
    verified: args.verified,
    eventType: args.eventType ?? null,
    amount: args.amount ?? null,
    responseStatus: args.responseStatus ?? null,
    notes: args.notes ?? [],
    shouldMarkPaid,
  };

  return args.db.transaction(async (tx) => {
    if (typeof (tx as { insert?: unknown }).insert === "function") {
      await ((tx as unknown) as DatabaseClient)
        .insert(paymentCallbackLogs)
        .values({
          brandId: matchedOrder.brandId,
          paymentId: matchedPayment.id,
          orderId: matchedOrder.id,
          provider,
          callbackType: "payment_notify",
          providerEventId: args.providerOrderId ?? `${args.gateway}:${matchedOrder.orderNo}:${args.eventType ?? "received"}`,
          providerTransactionId: args.providerOrderId ?? null,
          signatureStatus: args.signatureStatus,
          processStatus,
          requestHeadersJson: args.headers ?? null,
          payloadText: args.rawBody,
          processResultJson,
          processedAt: new Date(),
        });
    }

    if (shouldMarkPaid) {
      assertOrderStatusTransition(matchedOrder.status as OrderStatus, "paid");
      await tx
        .update(payments)
        .set({
          status: "paid",
          paidAt: new Date(),
          externalTransactionId: args.providerOrderId ?? matchedPayment.externalTransactionId ?? null,
          metaJson: {
            ...normalizeMetaJson(matchedPayment.metaJson),
            paymentMode: normalizeMetaJson(matchedPayment.metaJson).paymentMode ?? "production_live",
            paymentGateway: args.gateway,
            gatewayCallbackStage: args.stage ?? null,
            gatewayLastEventType: args.eventType ?? null,
          },
          updatedAt: new Date(),
        })
        .where(eq(payments.id, matchedPayment.id));

      await tx
        .update(orders)
        .set({
          status: "paid",
          paymentStatus: "paid",
          updatedAt: new Date(),
        })
        .where(eq(orders.id, matchedOrder.id));
    }

    return {
      accepted: true,
      matched: true,
      shouldMarkPaid,
      orderId: matchedOrder.id,
      paymentId: matchedPayment.id,
      orderNo: matchedOrder.orderNo,
      processStatus,
      notes: args.notes ?? [],
    };
  });
}
