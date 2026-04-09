import { randomUUID } from "node:crypto";
import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import superjson from "superjson";
import { z } from "zod";
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
} from "../../../packages/database/schema";

type DatabaseClient = ReturnType<typeof drizzle>;

type CustomerType = "b2b" | "b2c";
type TenantSource = "header" | "host";

type TierPriceRecord = {
  id?: number;
  minQty: number;
  maxQty: number | null;
  price: number;
  customerType: CustomerType | "all";
};

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

export type WechatPaymentDraft = {
  provider: "wechat_jsapi";
  paymentScenario: "full_payment" | "installment" | "credit_card";
  status: "pending_configuration";
  capabilities: {
    supportsCreditCard: boolean;
    supportsInstallment: boolean;
  };
  jsapiParams: {
    appId: string | null;
    timeStamp: string | null;
    nonceStr: string | null;
    package: string | null;
    signType: "RSA";
    paySign: string | null;
  };
  metadata: Record<string, unknown>;
  nextAction: string;
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

export function resolveTierPrice(args: {
  basePrice: number;
  quantity: number;
  customerType: CustomerType;
  tierPrices: TierPriceRecord[];
}) {
  const matchedTier = [...args.tierPrices]
    .filter((tier) => {
      const customerTypeMatches = tier.customerType === "all" || tier.customerType === args.customerType;
      const minMatches = args.quantity >= tier.minQty;
      const maxMatches = tier.maxQty === null || args.quantity <= tier.maxQty;
      return customerTypeMatches && minMatches && maxMatches;
    })
    .sort((left, right) => right.minQty - left.minQty)[0];

  return {
    unitPrice: matchedTier?.price ?? args.basePrice,
    matchedTier: matchedTier ?? null,
  };
}

export function buildOrderNo(brandId: number) {
  return `ORD-${brandId}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function buildPaymentNo(brandId: number) {
  return `PAY-${brandId}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;
}

export function buildWechatPaymentDraft(args: {
  orderId: number;
  orderNo: string;
  amount: number;
  brandId: number;
  openId?: string;
  paymentScenario: "full_payment" | "installment" | "credit_card";
  installmentPlanCode?: string;
}) {
  const metadata: Record<string, unknown> = {
    brandId: args.brandId,
    orderId: args.orderId,
    orderNo: args.orderNo,
    amount: args.amount,
    paymentScenario: args.paymentScenario,
    payerOpenId: args.openId ?? null,
  };

  if (args.installmentPlanCode) {
    metadata.installmentPlanCode = args.installmentPlanCode;
  }

  return {
    provider: "wechat_jsapi",
    paymentScenario: args.paymentScenario,
    status: "pending_configuration",
    capabilities: {
      supportsCreditCard: true,
      supportsInstallment: true,
    },
    jsapiParams: {
      appId: null,
      timeStamp: null,
      nonceStr: null,
      package: null,
      signType: "RSA",
      paySign: null,
    },
    metadata,
    nextAction:
      "在 packages/payments 接入微信支付官方签名与统一下单能力后，将当前占位参数替换为真实 JSAPI 支付参数，并在 paymentScenario 中继续承载信用卡付款与分期属性。",
  } satisfies WechatPaymentDraft;
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
    String((Array.isArray(args.headers["x-forwarded-host"]) ? args.headers["x-forwarded-host"][0] : args.headers["x-forwarded-host"]) ?? args.headers.host ?? ""),
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
const paymentProviderSchema = z.enum(["wechat_jsapi", "offline_bank_transfer"]);
const paymentScenarioSchema = z.enum(["full_payment", "installment", "credit_card"]);

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
        let categoryId: number | null = null;
        if (input.categorySlug) {
          const matchedCategory = await ctx.db
            .select()
            .from(productCategories)
            .where(
              and(
                eq(productCategories.brandId, ctx.tenant.brandId),
                eq(productCategories.slug, input.categorySlug),
              ),
            )
            .limit(1);

          categoryId = matchedCategory[0]?.id ?? null;
        }

        const productRows = await ctx.db
          .select()
          .from(products)
          .where(
            and(
              eq(products.brandId, ctx.tenant.brandId),
              input.includeInactive ? undefined : eq(products.status, "active"),
              categoryId ? eq(products.categoryId, categoryId) : undefined,
            ),
          );

        if (productRows.length === 0) {
          return {
            tenant: ctx.tenant,
            items: [],
          };
        }

        const productIds = productRows.map((product) => product.id);
        const skuRows = await ctx.db
          .select()
          .from(productSkus)
          .where(
            and(
              eq(productSkus.brandId, ctx.tenant.brandId),
              inArray(productSkus.productId, productIds),
              input.includeInactive ? undefined : eq(productSkus.status, "active"),
            ),
          );

        const skuIds = skuRows.map((sku) => sku.id);
        const tierRows = skuIds.length
          ? await ctx.db
              .select()
              .from(skuTierPrices)
              .where(
                and(
                  eq(skuTierPrices.brandId, ctx.tenant.brandId),
                  inArray(skuTierPrices.skuId, skuIds),
                ),
              )
          : [];

        const tiersBySkuId = new Map<number, typeof tierRows>();
        for (const tier of tierRows) {
          const existing = tiersBySkuId.get(tier.skuId) ?? [];
          existing.push(tier);
          tiersBySkuId.set(tier.skuId, existing);
        }

        const skusByProductId = new Map<number, typeof skuRows>();
        for (const sku of skuRows) {
          const existing = skusByProductId.get(sku.productId) ?? [];
          existing.push(sku);
          skusByProductId.set(sku.productId, existing);
        }

        return {
          tenant: ctx.tenant,
          items: productRows.map((product) => {
            const skus = (skusByProductId.get(product.id) ?? []).map((sku) => {
              const requestedQty = input.requestedQtyBySkuId[String(sku.id)] ?? sku.minOrderQty ?? 1;
              const tierPreview = resolveTierPrice({
                basePrice: sku.basePrice,
                quantity: requestedQty,
                customerType: input.customerType,
                tierPrices: (tiersBySkuId.get(sku.id) ?? []).map((tier) => ({
                  id: tier.id,
                  minQty: tier.minQty,
                  maxQty: tier.maxQty,
                  price: tier.price,
                  customerType: tier.customerType,
                })),
              });

              return {
                ...sku,
                requestedQty,
                pricing: {
                  pricingModel: "tiered",
                  unitPrice: tierPreview.unitPrice,
                  lineAmount: tierPreview.unitPrice * requestedQty,
                  matchedTier: tierPreview.matchedTier,
                  tierTable: tiersBySkuId.get(sku.id) ?? [],
                },
              };
            });

            return {
              ...product,
              skus,
            };
          }),
        };
      }),
  }),

  orders: router({
    create: connectedDbProcedure
      .input(
        z.object({
          userId: z.coerce.number().int().positive(),
          membershipId: z.coerce.number().int().positive().optional(),
          customerType: customerTypeSchema.default("b2b"),
          orderType: z
            .enum(["b2b_purchase", "b2c_purchase", "subscription", "service", "rental"])
            .default("b2b_purchase"),
          channel: z.enum(["admin", "web", "mini_program", "sales_manual"]).default("mini_program"),
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
          payment: z.object({
            provider: paymentProviderSchema,
            paymentScenario: paymentScenarioSchema.default("full_payment"),
            payerOpenId: z.string().optional(),
            allowCreditCard: z.boolean().default(false),
            installmentPlanCode: z.string().optional(),
            meta: z.record(z.string(), z.unknown()).default({}),
          }),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const membership = input.membershipId
          ? await ctx.db
              .select()
              .from(brandMemberships)
              .where(
                and(
                  eq(brandMemberships.id, input.membershipId),
                  eq(brandMemberships.brandId, ctx.tenant.brandId),
                  eq(brandMemberships.userId, input.userId),
                ),
              )
              .limit(1)
          : [];

        if (input.membershipId && !membership[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "未找到匹配当前品牌的客户成员关系。",
          });
        }

        const skuIds = input.items.map((item) => item.skuId);
        const skuRows = await ctx.db
          .select()
          .from(productSkus)
          .where(and(eq(productSkus.brandId, ctx.tenant.brandId), inArray(productSkus.id, skuIds)));

        if (skuRows.length !== skuIds.length) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "提交的商品 SKU 中存在不属于当前品牌或不存在的记录。",
          });
        }

        const productRows = await ctx.db
          .select()
          .from(products)
          .where(
            and(
              eq(products.brandId, ctx.tenant.brandId),
              inArray(
                products.id,
                Array.from(new Set(input.items.map((item) => item.productId))),
              ),
            ),
          );

        const tierRows = await ctx.db
          .select()
          .from(skuTierPrices)
          .where(and(eq(skuTierPrices.brandId, ctx.tenant.brandId), inArray(skuTierPrices.skuId, skuIds)));

        const productById = new Map(productRows.map((product) => [product.id, product]));
        const skuById = new Map(skuRows.map((sku) => [sku.id, sku]));
        const tierBySkuId = new Map<number, typeof tierRows>();
        for (const tier of tierRows) {
          const existing = tierBySkuId.get(tier.skuId) ?? [];
          existing.push(tier);
          tierBySkuId.set(tier.skuId, existing);
        }

        const pricedItems = input.items.map((item) => {
          const sku = skuById.get(item.skuId);
          const product = productById.get(item.productId);
          if (!sku || !product || sku.productId !== product.id) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `商品 ${item.productId} 与 SKU ${item.skuId} 不匹配。`,
            });
          }

          const pricing = resolveTierPrice({
            basePrice: sku.basePrice,
            quantity: item.quantity,
            customerType: input.customerType,
            tierPrices: (tierBySkuId.get(sku.id) ?? []).map((tier) => ({
              minQty: tier.minQty,
              maxQty: tier.maxQty,
              price: tier.price,
              customerType: tier.customerType,
            })),
          });

          return {
            item,
            sku,
            product,
            unitPrice: pricing.unitPrice,
            lineAmount: pricing.unitPrice * item.quantity,
            matchedTier: pricing.matchedTier,
          };
        });

        const subtotalAmount = pricedItems.reduce((sum, current) => sum + current.lineAmount, 0);
        const orderNo = buildOrderNo(ctx.tenant.brandId);
        const paymentNo = buildPaymentNo(ctx.tenant.brandId);

        const created = await ctx.db.transaction(async (tx) => {
          const orderInsert = await tx.insert(orders).values({
            brandId: ctx.tenant.brandId,
            userId: input.userId,
            membershipId: input.membershipId,
            orderNo,
            orderType: input.orderType,
            channel: input.channel,
            status: input.payment.provider === "offline_bank_transfer" ? "pending_payment" : "pending_payment",
            paymentStatus: "unpaid",
            fulfillmentStatus: "unfulfilled",
            currency: "CNY",
            subtotalAmount,
            discountAmount: 0,
            shippingAmount: 0,
            payableAmount: subtotalAmount,
            note: input.note,
          });

          const orderId = Number(orderInsert[0].insertId);

          await tx.insert(orderItems).values(
            pricedItems.map((priced) => ({
              orderId,
              brandId: ctx.tenant.brandId,
              productId: priced.product.id,
              skuId: priced.sku.id,
              productName: priced.product.name,
              skuLabel: priced.sku.specName ?? priced.sku.packSize ?? priced.sku.skuCode,
              unitPrice: priced.unitPrice,
              quantity: priced.item.quantity,
              lineAmount: priced.lineAmount,
            })),
          );

          const paymentMeta: Record<string, unknown> = {
            ...input.payment.meta,
            allowCreditCard: input.payment.allowCreditCard,
            installmentPlanCode: input.payment.installmentPlanCode ?? null,
            reservedForWechatCapabilities: {
              supportsCreditCard: true,
              supportsInstallment: true,
            },
          };

          const paymentInsert = await tx.insert(payments).values({
            brandId: ctx.tenant.brandId,
            orderId,
            paymentNo,
            provider: input.payment.provider,
            paymentScenario: input.payment.provider === "offline_bank_transfer" ? "offline_review" : input.payment.paymentScenario,
            amount: subtotalAmount,
            status: input.payment.provider === "offline_bank_transfer" ? "pending" : "created",
            metaJson: paymentMeta,
          });

          const paymentId = Number(paymentInsert[0].insertId);

          return {
            orderId,
            paymentId,
          };
        });

        const paymentIntent =
          input.payment.provider === "wechat_jsapi"
            ? buildWechatPaymentDraft({
                brandId: ctx.tenant.brandId,
                orderId: created.orderId,
                orderNo,
                amount: subtotalAmount,
                openId: input.payment.payerOpenId,
                paymentScenario: input.payment.paymentScenario,
                installmentPlanCode: input.payment.installmentPlanCode,
              })
            : {
                provider: "offline_bank_transfer",
                paymentScenario: "offline_review",
                status: "pending_receipt_upload",
                uploadField: "receiptFileUrl",
                nextAction: "请调用 payments.submitBankTransferReceipt 接口上传打款凭证 URL，并将订单流转到待审核状态。",
              };

        return {
          tenant: ctx.tenant,
          order: {
            id: created.orderId,
            orderNo,
            subtotalAmount,
            payableAmount: subtotalAmount,
            status: "pending_payment",
            paymentStatus: "unpaid",
          },
          items: pricedItems.map((priced) => ({
            productId: priced.product.id,
            productName: priced.product.name,
            skuId: priced.sku.id,
            skuCode: priced.sku.skuCode,
            quantity: priced.item.quantity,
            unitPrice: priced.unitPrice,
            lineAmount: priced.lineAmount,
            matchedTier: priced.matchedTier,
          })),
          payment: {
            id: created.paymentId,
            paymentNo,
            provider: input.payment.provider,
            scenario: input.payment.provider === "offline_bank_transfer" ? "offline_review" : input.payment.paymentScenario,
            amount: subtotalAmount,
          },
          paymentIntent,
        };
      }),
  }),

  payments: router({
    submitBankTransferReceipt: connectedDbProcedure
      .input(
        z.object({
          orderId: z.coerce.number().int().positive(),
          paymentId: z.coerce.number().int().positive().optional(),
          payerName: z.string().min(1).optional(),
          payerAccountNo: z.string().min(1).optional(),
          receiptFileKey: z.string().optional(),
          receiptFileUrl: z.string().url(),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const orderRow = await ctx.db
          .select()
          .from(orders)
          .where(and(eq(orders.id, input.orderId), eq(orders.brandId, ctx.tenant.brandId)))
          .limit(1);

        if (!orderRow[0]) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "未找到当前品牌下对应的订单。",
          });
        }

        let paymentId = input.paymentId ?? null;
        if (paymentId) {
          const paymentRow = await ctx.db
            .select()
            .from(payments)
            .where(and(eq(payments.id, paymentId), eq(payments.brandId, ctx.tenant.brandId)))
            .limit(1);

          if (!paymentRow[0]) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "未找到当前品牌下对应的支付记录。",
            });
          }
        } else {
          const paymentNo = buildPaymentNo(ctx.tenant.brandId);
          const paymentInsert = await ctx.db.insert(payments).values({
            brandId: ctx.tenant.brandId,
            orderId: orderRow[0].id,
            paymentNo,
            provider: "offline_bank_transfer",
            paymentScenario: "offline_review",
            amount: orderRow[0].payableAmount,
            status: "reviewing",
            metaJson: {
              source: "bank_transfer_receipt_upload",
            },
          });
          paymentId = Number(paymentInsert[0].insertId);
        }

        const receiptInsert = await ctx.db.insert(bankTransferReceipts).values({
          brandId: ctx.tenant.brandId,
          orderId: orderRow[0].id,
          paymentId,
          payerName: input.payerName,
          payerAccountNo: input.payerAccountNo,
          receiptFileKey: input.receiptFileKey,
          receiptFileUrl: input.receiptFileUrl,
          reviewStatus: "pending",
        });

        await ctx.db
          .update(orders)
          .set({
            status: "under_review",
            paymentStatus: "offline_review",
            updatedAt: new Date(),
          })
          .where(and(eq(orders.id, orderRow[0].id), eq(orders.brandId, ctx.tenant.brandId)));

        await ctx.db
          .update(payments)
          .set({
            status: "reviewing",
            updatedAt: new Date(),
          })
          .where(and(eq(payments.id, paymentId), eq(payments.brandId, ctx.tenant.brandId)));

        return {
          tenant: ctx.tenant,
          order: {
            id: orderRow[0].id,
            orderNo: orderRow[0].orderNo,
            status: "under_review",
            paymentStatus: "offline_review",
          },
          receipt: {
            id: Number(receiptInsert[0].insertId),
            paymentId,
            reviewStatus: "pending",
            receiptFileUrl: input.receiptFileUrl,
          },
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
