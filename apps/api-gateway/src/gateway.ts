import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import superjson from "superjson";
import { z } from "zod";
import { notifyOwner } from "../../admin/server/_core/notification";
import { brands } from "../../../packages/database/schema";
import { createOrder, getOrderDetail, listOrders, reviewOrderPayment } from "../../../packages/oms/src/index";
import {
  getBankTransferAccountInfo,
  getPaymentApiInventory,
  prepareWechatPrepayDraft,
  submitBankTransferVoucher,
} from "../../../packages/payments/src/index";
import { listProductsWithPricing } from "../../../packages/pim/src/index";

type DatabaseClient = ReturnType<typeof drizzle>;
type TenantSource = "header" | "host";

export type TenantContext = {
  brandId: number;
  brandCode?: string | null;
  brandName?: string | null;
  domain?: string | null;
  source: TenantSource;
};

export type ApiContext = {
  db: DatabaseClient | null;
  tenant: TenantContext | null;
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
};

export function normalizeHost(host?: string | null): string | null {
  if (!host) return null;
  const first = host.split(",")[0]?.trim() ?? "";
  if (!first) return null;
  return first.replace(/^https?:\/\//, "").split(":")[0]?.toLowerCase() ?? null;
}

export function extractRequestedBrandId(headers: Record<string, unknown>): number | null {
  const candidate =
    headers["x-brand-id"] ??
    headers["brand_id"] ??
    headers["brand-id"] ??
    headers["x-tenant-id"] ??
    null;

  const raw = Array.isArray(candidate) ? candidate[0] : candidate;
  if (raw === null || raw === undefined) return null;
  const parsed = Number(String(raw).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

async function getDb() {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return drizzle(process.env.DATABASE_URL);
}

async function resolveTenantByHeaderOrHost(args: {
  db: DatabaseClient | null;
  headers: Record<string, unknown>;
}) {
  const requestedBrandId = extractRequestedBrandId(args.headers);
  const requestedHost = normalizeHost(
    String(
      (Array.isArray(args.headers["x-forwarded-host"])
        ? args.headers["x-forwarded-host"][0]
        : args.headers["x-forwarded-host"]) ?? args.headers.host ?? "",
    ),
  );

  if (requestedBrandId) {
    if (!args.db) {
      return {
        brandId: requestedBrandId,
        source: "header",
      } satisfies TenantContext;
    }

    const matched = await args.db.select().from(brands).where(eq(brands.id, requestedBrandId)).limit(1);
    if (!matched[0]) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `未找到 brandId=${requestedBrandId} 对应的租户。`,
      });
    }

    return {
      brandId: matched[0].id,
      brandCode: matched[0].code,
      brandName: matched[0].name,
      domain: matched[0].domain,
      source: "header",
    } satisfies TenantContext;
  }

  if (requestedHost && args.db) {
    const matched = await args.db.select().from(brands).where(eq(brands.domain, requestedHost)).limit(1);
    if (matched[0]) {
      return {
        brandId: matched[0].id,
        brandCode: matched[0].code,
        brandName: matched[0].name,
        domain: matched[0].domain,
        source: "host",
      } satisfies TenantContext;
    }
  }

  return null;
}

export async function createContext({ req, res }: CreateExpressContextOptions): Promise<ApiContext> {
  const db = await getDb();
  const headers = Object.fromEntries(Object.entries(req.headers));
  const tenant = await resolveTenantByHeaderOrHost({ db, headers });

  return {
    db,
    tenant,
    req,
    res,
  };
}

const t = initTRPC.context<ApiContext>().create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const tenantProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.tenant) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "缺少租户上下文。请在请求头传入 x-brand-id / brand_id，或通过已绑定域名访问。",
    });
  }

  return next({
    ctx: {
      ...ctx,
      tenant: ctx.tenant,
    },
  });
});

const connectedDbProcedure = tenantProcedure.use(({ ctx, next }) => {
  if (!ctx.db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "数据库未连接，当前无法执行交易链路。",
    });
  }

  return next({
    ctx: {
      ...ctx,
      db: ctx.db,
    },
  });
});

const customerTypeSchema = z.enum(["b2b", "b2c"]);
const orderStatusSchema = z.enum(["pending_payment", "under_review", "paid", "processing", "shipped", "completed", "cancelled", "closed"]);
const paymentStatusSchema = z.enum(["unpaid", "paid", "part_paid", "offline_review", "refunded"]);
const fulfillmentStatusSchema = z.enum(["unfulfilled", "processing", "partial_shipped", "shipped", "delivered"]);
const paymentProviderSchema = z.enum(["wechat_jsapi", "offline_bank_transfer", "alipay"]);
const paymentScenarioSchema = z.enum(["full_payment", "installment", "credit_card", "deposit", "offline_review"]);

export const appRouter = router({
  health: publicProcedure.query(() => ({
    service: "api-gateway",
    ok: true,
    timestamp: Date.now(),
  })),

  tenant: router({
    resolve: tenantProcedure.query(({ ctx }) => ({
      tenant: ctx.tenant,
    })),
  }),

  products: router({
    list: connectedDbProcedure
      .input(
        z.object({
          categorySlug: z.string().min(1).optional(),
          customerType: customerTypeSchema.default("b2b"),
          requestedQtyBySkuId: z.record(z.string(), z.coerce.number().int().positive()).default({}),
          includeInactive: z.boolean().default(false),
        }),
      )
      .query(async ({ ctx, input }) => {
        const result = await listProductsWithPricing({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          categorySlug: input.categorySlug,
          customerType: input.customerType,
          requestedQtyBySkuId: input.requestedQtyBySkuId,
          includeInactive: input.includeInactive,
        });

        return {
          tenant: ctx.tenant,
          ...result,
        };
      }),
  }),

  orders: router({
    list: connectedDbProcedure
      .input(
        z.object({
          userId: z.coerce.number().int().positive().optional(),
          membershipId: z.coerce.number().int().positive().optional(),
          orderId: z.coerce.number().int().positive().optional(),
          orderNo: z.string().min(1).optional(),
          status: orderStatusSchema.optional(),
          paymentStatus: paymentStatusSchema.optional(),
          fulfillmentStatus: fulfillmentStatusSchema.optional(),
          limit: z.coerce.number().int().positive().max(100).default(20),
        }),
      )
      .query(async ({ ctx, input }) => {
        const result = await listOrders({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          userId: input.userId,
          membershipId: input.membershipId,
          orderId: input.orderId,
          orderNo: input.orderNo,
          status: input.status,
          paymentStatus: input.paymentStatus,
          fulfillmentStatus: input.fulfillmentStatus,
          limit: input.limit,
        });

        return {
          tenant: ctx.tenant,
          ...result,
        };
      }),

    detail: connectedDbProcedure
      .input(
        z.object({
          orderId: z.coerce.number().int().positive().optional(),
          orderNo: z.string().min(1).optional(),
        }),
      )
      .query(async ({ ctx, input }) => {
        const result = await getOrderDetail({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          orderId: input.orderId,
          orderNo: input.orderNo,
        });

        return {
          tenant: ctx.tenant,
          ...result,
        };
      }),

    create: connectedDbProcedure
      .input(
        z.object({
          userId: z.coerce.number().int().positive(),
          membershipId: z.coerce.number().int().positive().optional(),
          customerType: customerTypeSchema.optional(),
          note: z.string().max(1000).optional(),
          items: z
            .array(
              z.object({
                productId: z.coerce.number().int().positive(),
                skuId: z.coerce.number().int().positive(),
                quantity: z.coerce.number().int().positive(),
              }),
            )
            .min(1),
          payment: z
            .object({
              provider: paymentProviderSchema.default("offline_bank_transfer"),
              paymentScenario: paymentScenarioSchema.default("full_payment"),
              payerOpenId: z.string().optional(),
              allowCreditCard: z.boolean().default(false),
              installmentPlanCode: z.string().optional(),
            })
            .default({ provider: "offline_bank_transfer", paymentScenario: "full_payment", allowCreditCard: false }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const created = await createOrder({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          userId: input.userId,
          membershipId: input.membershipId,
          customerType: input.customerType,
          note: input.note,
          items: input.items,
          payment: {
            provider: input.payment.provider,
            paymentScenario:
              input.payment.provider === "offline_bank_transfer"
                ? "offline_review"
                : input.payment.paymentScenario,
            installmentPlanCode: input.payment.installmentPlanCode,
            allowCreditCard: input.payment.allowCreditCard,
            payerOpenId: input.payment.payerOpenId,
          },
        });

        const paymentIntent =
          input.payment.provider === "wechat_jsapi"
            ? await prepareWechatPrepayDraft({
                db: ctx.db,
                brandId: ctx.tenant.brandId,
                orderId: created.order.id,
                paymentId: created.payment.id,
                payerOpenId: input.payment.payerOpenId,
                paymentScenario: input.payment.paymentScenario,
                installmentPlanCode: input.payment.installmentPlanCode,
              })
            : input.payment.provider === "offline_bank_transfer"
              ? {
                  provider: "offline_bank_transfer" as const,
                  integrationMode: "manual_review" as const,
                  status: "pending_receipt_upload" as const,
                  bankAccount: getBankTransferAccountInfo(),
                  requiredApis: [],
                  metadata: {
                    brandId: ctx.tenant.brandId,
                    orderId: created.order.id,
                    orderNo: created.order.orderNo,
                    paymentId: created.payment.id,
                  },
                  nextAction: "请在打款完成后调用 payments.submitBankTransferReceipt 上传凭证，系统将自动进入财务审核。",
                }
              : {
                  provider: "alipay" as const,
                  integrationMode: "stubbed" as const,
                  status: "pending_provider_configuration" as const,
                  requiredApis: getPaymentApiInventory().filter((item) => item.provider === "alipay"),
                  metadata: {
                    brandId: ctx.tenant.brandId,
                    orderId: created.order.id,
                    orderNo: created.order.orderNo,
                    paymentId: created.payment.id,
                    paymentScenario: input.payment.paymentScenario,
                  },
                  nextAction: "当前已跳过支付宝真实 API 接入，后续只需根据 API 清单补齐统一收单、回调验签与查询补偿。",
                };

        return {
          tenant: ctx.tenant,
          order: created.order,
          items: created.items.map((priced) => ({
            productId: priced.product.id,
            productName: priced.product.name,
            skuId: priced.sku.id,
            skuCode: priced.sku.skuCode,
            quantity: priced.item.quantity,
            unitPrice: priced.unitPrice,
            lineAmount: priced.lineAmount,
            matchedTier: priced.matchedTier,
          })),
          payment: created.payment,
          paymentIntent,
        };
      }),
  }),

  payments: router({
    apiInventory: connectedDbProcedure.query(({ ctx }) => ({
      tenant: ctx.tenant,
      items: getPaymentApiInventory(),
    })),

    prepareWechatPrepay: connectedDbProcedure
      .input(
        z.object({
          orderId: z.coerce.number().int().positive(),
          paymentId: z.coerce.number().int().positive().optional(),
          payerOpenId: z.string().optional(),
          paymentScenario: paymentScenarioSchema.default("full_payment"),
          installmentPlanCode: z.string().optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await prepareWechatPrepayDraft({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          orderId: input.orderId,
          paymentId: input.paymentId,
          payerOpenId: input.payerOpenId,
          paymentScenario: input.paymentScenario,
          installmentPlanCode: input.installmentPlanCode,
        });

        return {
          tenant: ctx.tenant,
          order: result.order,
          payment: result.payment,
          draft: result.draft,
        };
      }),

    submitBankTransferReceipt: connectedDbProcedure
      .input(
        z.object({
          orderId: z.coerce.number().int().positive(),
          paymentId: z.coerce.number().int().positive().optional(),
          remitterName: z.string().min(1).optional(),
          remitterAccountLast4: z.string().min(4).max(4).optional(),
          transferReference: z.string().min(1).optional(),
          transferAmount: z.coerce.number().positive().optional(),
          voucherUrl: z.string().url(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await submitBankTransferVoucher({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          orderId: input.orderId,
          paymentId: input.paymentId,
          voucherUrl: input.voucherUrl,
          remitterName: input.remitterName,
          remitterAccountLast4: input.remitterAccountLast4,
          transferReference: input.transferReference,
          transferAmount: input.transferAmount,
          notifyAdmin: notifyOwner,
        });

        return {
          tenant: ctx.tenant,
          ...result,
        };
      }),

    reviewBankTransferReceipt: connectedDbProcedure
      .input(
        z.object({
          orderId: z.coerce.number().int().positive(),
          paymentId: z.coerce.number().int().positive().optional(),
          receiptId: z.coerce.number().int().positive().optional(),
          approved: z.boolean(),
          reviewedBy: z.coerce.number().int().positive().optional(),
          reviewNote: z.string().max(500).optional(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const result = await reviewOrderPayment({
          db: ctx.db,
          brandId: ctx.tenant.brandId,
          orderId: input.orderId,
          paymentId: input.paymentId,
          receiptId: input.receiptId,
          approved: input.approved,
          reviewedBy: input.reviewedBy,
          reviewNote: input.reviewNote,
        });

        return {
          tenant: ctx.tenant,
          ...result,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
