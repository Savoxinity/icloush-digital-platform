import { randomUUID } from "node:crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bankTransferReceipts, orders, payments } from "../../database/schema";

export type DatabaseClient = ReturnType<typeof drizzle>;
export type PaymentProvider = "wechat_jsapi" | "offline_bank_transfer" | "alipay";
export type PaymentScenario = "full_payment" | "installment" | "credit_card" | "deposit" | "offline_review";

export type PaymentApiInventoryItem = {
  provider: "wechat_pay" | "alipay";
  capability: string;
  phase: "auth" | "create" | "callback" | "query" | "refund" | "transfer";
  method: string;
  endpoint: string;
  required: boolean;
  purpose: string;
  notes: string;
};

const buildPaymentNo = (brandId: number) =>
  `PAY-${brandId}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const normalizeMetaJson = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const extractFileKeyFromUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
};

export const PAYMENT_API_INVENTORY: PaymentApiInventoryItem[] = [
  {
    provider: "wechat_pay",
    capability: "JSAPI 下单",
    phase: "create",
    method: "POST",
    endpoint: "/v3/pay/transactions/jsapi",
    required: true,
    purpose: "创建微信 JSAPI 预支付交易单，返回 prepay_id。",
    notes: "用于小程序或公众号收银，前端需二次签名后调起支付。",
  },
  {
    provider: "wechat_pay",
    capability: "支付结果通知",
    phase: "callback",
    method: "POST",
    endpoint: "商户自定义 notify_url",
    required: true,
    purpose: "接收微信支付异步回调并验签，更新订单与支付状态。",
    notes: "回调 URL 必须公网可达，并配合平台证书完成签名校验。",
  },
  {
    provider: "wechat_pay",
    capability: "订单查询",
    phase: "query",
    method: "GET",
    endpoint: "/v3/pay/transactions/out-trade-no/{out_trade_no}",
    required: true,
    purpose: "在回调延迟、丢失或人工排障时主动核单。",
    notes: "建议与本地补偿任务结合。",
  },
  {
    provider: "wechat_pay",
    capability: "退款申请",
    phase: "refund",
    method: "POST",
    endpoint: "/v3/refund/domestic/refunds",
    required: false,
    purpose: "售后场景发起原路退款。",
    notes: "若接入售后，需同步设计退款回调与查询。",
  },
  {
    provider: "wechat_pay",
    capability: "退款结果通知",
    phase: "callback",
    method: "POST",
    endpoint: "商户自定义 refund_notify_url",
    required: false,
    purpose: "接收退款异步结果并更新售后状态。",
    notes: "与退款申请配套使用。",
  },
  {
    provider: "wechat_pay",
    capability: "商家转账",
    phase: "transfer",
    method: "POST",
    endpoint: "/v3/transfer/batches",
    required: false,
    purpose: "向个人零钱或结算场景发起企业付款。",
    notes: "仅在后续需要平台主动打款时接入。",
  },
  {
    provider: "alipay",
    capability: "统一收单创建交易",
    phase: "create",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.trade.create",
    required: true,
    purpose: "创建支付宝交易单。",
    notes: "不同终端收银形态由 product_code 与 buyer_id/open_id 区分。",
  },
  {
    provider: "alipay",
    capability: "支付结果通知",
    phase: "callback",
    method: "POST",
    endpoint: "商户自定义 notify_url",
    required: true,
    purpose: "接收支付宝支付异步通知并验签。",
    notes: "需要支付宝公钥、应用私钥与签名算法配置。",
  },
  {
    provider: "alipay",
    capability: "订单查询",
    phase: "query",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.trade.query",
    required: true,
    purpose: "当回调缺失时主动核单。",
    notes: "建议用 out_trade_no 做幂等补偿。",
  },
  {
    provider: "alipay",
    capability: "退款申请",
    phase: "refund",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.trade.refund",
    required: false,
    purpose: "售后退款。",
    notes: "可与退款查询接口一起规划。",
  },
  {
    provider: "alipay",
    capability: "单笔转账",
    phase: "transfer",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.fund.trans.uni.transfer",
    required: false,
    purpose: "企业向支付宝账户付款。",
    notes: "适合佣金结算或返利。",
  },
];

export function getPaymentApiInventory() {
  return PAYMENT_API_INVENTORY;
}

export function buildWechatPaymentDraft(args: {
  brandId: number;
  orderId: number;
  orderNo: string;
  amount: number;
  openId?: string | null;
  paymentScenario?: PaymentScenario;
  installmentPlanCode?: string | null;
}) {
  const paymentScenario = args.paymentScenario ?? "full_payment";
  return {
    provider: "wechat_jsapi" as const,
    integrationMode: "stubbed" as const,
    status: "pending_provider_configuration" as const,
    capabilities: {
      supportsCreditCard: paymentScenario === "credit_card" || paymentScenario === "installment",
      supportsInstallment: paymentScenario === "installment",
    },
    jsapiParams: null,
    requiredApis: PAYMENT_API_INVENTORY.filter((item) => item.provider === "wechat_pay"),
    metadata: {
      brandId: args.brandId,
      orderId: args.orderId,
      orderNo: args.orderNo,
      amount: args.amount,
      paymentScenario,
      installmentPlanCode: args.installmentPlanCode ?? null,
      payerOpenId: args.openId ?? null,
    },
  };
}

export async function prepareWechatPrepayDraft(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId?: number;
  payerOpenId?: string | null;
  paymentScenario?: PaymentScenario;
  installmentPlanCode?: string | null;
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
      message: "订单不存在，无法生成微信支付草稿。",
    });
  }

  const paymentRows = await args.db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.brandId, args.brandId),
        eq(payments.orderId, order.id),
        args.paymentId ? eq(payments.id, args.paymentId) : eq(payments.provider, "wechat_jsapi"),
      ),
    )
    .orderBy(desc(payments.id))
    .limit(1);

  let payment = paymentRows[0];
  const paymentScenario = args.paymentScenario ?? "full_payment";

  if (!payment) {
    const inserted = await args.db
      .insert(payments)
      .values({
        brandId: args.brandId,
        orderId: order.id,
        paymentNo: buildPaymentNo(args.brandId),
        provider: "wechat_jsapi",
        paymentScenario,
        amount: order.payableAmount,
        status: "created",
        metaJson: {
          payerOpenId: args.payerOpenId ?? null,
          installmentPlanCode: args.installmentPlanCode ?? null,
        },
      })
      .$returningId();

    const createdRows = await args.db.select().from(payments).where(eq(payments.id, inserted[0].id)).limit(1);
    payment = createdRows[0];
  } else {
    await args.db
      .update(payments)
      .set({
        paymentScenario,
        metaJson: {
          ...normalizeMetaJson(payment.metaJson),
          payerOpenId: args.payerOpenId ?? null,
          installmentPlanCode: args.installmentPlanCode ?? null,
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
  }

  return {
    order,
    payment,
    draft: buildWechatPaymentDraft({
      brandId: args.brandId,
      orderId: order.id,
      orderNo: order.orderNo,
      amount: payment?.amount ?? order.payableAmount,
      openId: args.payerOpenId,
      paymentScenario,
      installmentPlanCode: args.installmentPlanCode,
    }),
  };
}

export function getBankTransferAccountInfo() {
  return {
    beneficiaryName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "iCloush Finance Team",
    bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "Pending Configuration Bank",
    accountNo: process.env.BANK_TRANSFER_ACCOUNT_NO ?? "PENDING-CONFIGURATION",
    branchName: process.env.BANK_TRANSFER_BRANCH_NAME ?? null,
    instructions:
      process.env.BANK_TRANSFER_INSTRUCTIONS ??
      "请在汇款附言中填写订单号，并在上传凭证后等待财务审核。",
  };
}

export async function submitBankTransferVoucher(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId?: number;
  voucherUrl: string;
  remitterName?: string | null;
  remitterAccountLast4?: string | null;
  transferReference?: string | null;
  transferAmount?: number | null;
  notifyAdmin?: (payload: { title: string; content: string }) => Promise<boolean>;
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
      message: "订单不存在，无法上传对公转账凭证。",
    });
  }

  let payment = (
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
      .orderBy(desc(payments.id))
      .limit(1)
  )[0];

  if (!payment) {
    const created = await args.db
      .insert(payments)
      .values({
        brandId: args.brandId,
        orderId: order.id,
        paymentNo: buildPaymentNo(args.brandId),
        provider: "offline_bank_transfer",
        paymentScenario: "offline_review",
        amount: order.payableAmount,
        status: "reviewing",
        metaJson: {
          remitterName: args.remitterName ?? null,
          remitterAccountLast4: args.remitterAccountLast4 ?? null,
          transferReference: args.transferReference ?? null,
        },
      })
      .$returningId();

    const createdPaymentRows = await args.db.select().from(payments).where(eq(payments.id, created[0].id)).limit(1);
    payment = createdPaymentRows[0];
  }

  const insertedReceipt = await args.db
    .insert(bankTransferReceipts)
    .values({
      brandId: args.brandId,
      orderId: order.id,
      paymentId: payment.id,
      payerName: args.remitterName ?? null,
      payerAccountNo: args.remitterAccountLast4 ? `****${args.remitterAccountLast4}` : null,
      receiptFileKey: extractFileKeyFromUrl(args.voucherUrl),
      receiptFileUrl: args.voucherUrl,
      reviewStatus: "pending",
    })
    .$returningId();

  await args.db
    .update(orders)
    .set({
      status: "under_review",
      paymentStatus: "offline_review",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await args.db
    .update(payments)
    .set({
      status: "reviewing",
      paymentScenario: "offline_review",
      metaJson: {
        ...normalizeMetaJson(payment.metaJson),
        remitterName: args.remitterName ?? null,
        remitterAccountLast4: args.remitterAccountLast4 ?? null,
        transferReference: args.transferReference ?? null,
        transferAmount: args.transferAmount ?? order.payableAmount,
      },
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  const notification = {
    title: `订单 ${order.orderNo} 已提交对公转账凭证`,
    content: `品牌 ${args.brandId} 的订单 ${order.orderNo} 已进入财务审核。付款金额：${args.transferAmount ?? order.payableAmount} ${order.currency}；汇款人：${args.remitterName ?? "未填写"}；参考号：${args.transferReference ?? "未填写"}`,
  };

  const notificationSent = args.notifyAdmin ? await args.notifyAdmin(notification) : false;

  return {
    orderId: order.id,
    paymentId: payment.id,
    receiptId: insertedReceipt[0].id,
    nextStatus: "under_review" as const,
    notification: {
      ...notification,
      sent: notificationSent,
    },
  };
}
