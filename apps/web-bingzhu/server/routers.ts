import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { brands } from "../../../packages/database/schema";
import {
  createOrder,
  getOrderDetail,
  listOrderReviewQueue,
  listOrders,
  reviewOrderPayment,
  settleSandboxOrderPayment,
} from "../../../packages/oms/src/index";
import { createPaymentOrder } from "../../../packages/payments/src/index";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAdminOperationsSnapshot,
  getBingzhuCatalog,
  getDb,
  getManagedProductDetail,
  getPlatformSnapshot,
  getPublicCatalog,
  getSiteContactConfig,
  listEnterpriseApplicationsByUser,
  listManagedProducts,
  listSiteCaseStudies,
  listSiteClientLogos,
  listSiteSolutionModules,
  replaceSiteCaseStudies,
  replaceSiteClientLogos,
  replaceSiteSolutionModules,
  reviewEnterpriseApplication as reviewEnterpriseApplicationInDb,
  submitEnterpriseApplication as submitEnterpriseApplicationToDb,
  submitSiteLead,
  upsertSiteContactConfig,
} from "./db";

const orderStatusSchema = z.enum([
  "pending_payment",
  "under_review",
  "paid",
  "processing",
  "shipped",
  "completed",
  "cancelled",
  "closed",
]);

const paymentStatusSchema = z.enum(["unpaid", "paid", "part_paid", "offline_review", "refunded"]);
const fulfillmentStatusSchema = z.enum(["unfulfilled", "processing", "partial_shipped", "shipped", "delivered"]);
const reviewStatusSchema = z.enum(["pending", "approved", "rejected"]);

const adminOrderFilterSchema = z.object({
  brandId: z.number().int().positive(),
  orderId: z.number().int().positive().optional(),
  orderNo: z.string().trim().min(1).optional(),
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  fulfillmentStatus: fulfillmentStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const myOrderFilterSchema = z.object({
  brandId: z.number().int().positive(),
  status: orderStatusSchema.optional(),
  paymentStatus: paymentStatusSchema.optional(),
  fulfillmentStatus: fulfillmentStatusSchema.optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const orderDetailSchema = z
  .object({
    brandId: z.number().int().positive(),
    orderId: z.number().int().positive().optional(),
    orderNo: z.string().trim().min(1).optional(),
  })
  .refine(input => Boolean(input.orderId || input.orderNo), {
    message: "查询订单详情时必须提供 orderId 或 orderNo。",
    path: ["orderId"],
  });

const reviewQueueSchema = z.object({
  brandId: z.number().int().positive(),
  reviewStatus: reviewStatusSchema.optional(),
  orderId: z.number().int().positive().optional(),
  orderNo: z.string().trim().min(1).optional(),
  paymentId: z.number().int().positive().optional(),
  receiptId: z.number().int().positive().optional(),
  reviewedBy: z.number().int().positive().optional(),
  limit: z.number().int().min(1).max(100).optional(),
});

const reviewPaymentSchema = z.object({
  brandId: z.number().int().positive(),
  orderId: z.number().int().positive(),
  paymentId: z.number().int().positive().optional(),
  receiptId: z.number().int().positive().optional(),
  approved: z.boolean(),
  reviewNote: z.string().trim().max(500).nullish(),
});

const adminOperationsSchema = z.object({
  brandId: z.number().int().positive().optional(),
});

const managedProductSeriesSchema = z.enum(["AP", "FC"]);
const managedProductStatusSchema = z.enum(["draft", "active", "archived"]);
const retailGatewaySchema = z.enum(["wechat_pay_v3", "alipay_openapi"]);
const retailCurrencySchema = z.enum(["CNY", "USD"]);
const customSkuComponentSchema = z.object({
  componentId: z.number().int().positive(),
});
const managedProductListSchema = z.object({
  brandId: z.number().int().positive().optional(),
  series: z.union([managedProductSeriesSchema, z.literal("all")]).optional(),
  status: z.union([managedProductStatusSchema, z.literal("all")]).optional(),
});
const managedProductDetailSchema = z
  .object({
    id: z.number().int().positive().optional(),
    code: z.string().trim().min(1).max(64).optional(),
    slug: z.string().trim().min(1).max(255).optional(),
    brandId: z.number().int().positive().optional(),
  })
  .refine((input) => Boolean(input.id || input.code || input.slug), {
    message: "查询商品详情时必须提供 id、code 或 slug。",
    path: ["id"],
  });
const retailOrderItemSchema = z.object({
  productId: z.number().int().positive(),
  skuId: z.number().int().positive(),
  quantity: z.number().int().min(1).max(99),
});
const retailCreateOrderSchema = z.object({
  brandId: z.number().int().positive(),
  items: z.array(retailOrderItemSchema).min(1).max(20),
  gateway: retailGatewaySchema.default("wechat_pay_v3"),
  note: z.string().trim().max(500).nullish(),
  currency: retailCurrencySchema.default("CNY"),
  customization: z.object({
    components: z.array(customSkuComponentSchema).min(3).max(3),
  }).nullish(),
  logistics: z.object({
    fulfillmentMethod: z.enum(["ground_delivery", "instant_pickup"]).default("ground_delivery"),
    recipientRegion: z.string().trim().max(255).nullish(),
    addressLine: z.string().trim().max(500).nullish(),
  }).nullish(),
  origin: z.string().url().nullish(),
  returnUrl: z.string().url().nullish(),
  payerOpenId: z.string().trim().min(1).max(128).nullish(),
});
const retailOrderStatusSchema = z
  .object({
    brandId: z.number().int().positive(),
    orderId: z.number().int().positive().optional(),
    orderNo: z.string().trim().min(1).optional(),
  })
  .refine((input) => Boolean(input.orderId || input.orderNo), {
    message: "查询零售订单状态时必须提供 orderId 或 orderNo。",
    path: ["orderId"],
  });

const platformSiteKeySchema = z.enum(["shop", "lab", "tech", "astro", "care"]);

const siteContactQuerySchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  contactScene: z.string().trim().min(1).optional(),
});

const siteCaseStudiesQuerySchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(12).optional(),
});

const siteSolutionModulesQuerySchema = siteCaseStudiesQuerySchema;
const siteClientLogosQuerySchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  limit: z.number().int().min(1).max(16).optional(),
});

const siteLeadSubmissionSchema = z
  .object({
    siteKey: platformSiteKeySchema,
    sourcePage: z.string().trim().max(255).optional(),
    companyName: z.string().trim().max(255).optional(),
    contactName: z.string().trim().min(2).max(120),
    mobile: z.string().trim().max(32).optional(),
    email: z.string().trim().email().max(320).optional(),
    roomCount: z.number().int().positive().max(10000).optional(),
    laundryVolume: z.string().trim().max(100).optional(),
    message: z.string().trim().max(2000).optional(),
  })
  .refine(input => Boolean(input.mobile || input.email), {
    message: "请至少填写手机或邮箱中的一项。",
    path: ["mobile"],
  });

const enterpriseApplicationQuerySchema = z.object({
  brandId: z.number().int().positive().optional(),
});

const enterpriseApplicationSubmissionSchema = z
  .object({
    brandId: z.number().int().positive(),
    sourceSite: platformSiteKeySchema.optional(),
    sourcePage: z.string().trim().max(255).optional(),
    enterpriseName: z.string().trim().min(2).max(255),
    contactName: z.string().trim().min(2).max(120),
    mobile: z.string().trim().max(32).optional(),
    email: z.string().trim().email().max(320).optional(),
    message: z.string().trim().max(2000).optional(),
  })
  .refine(input => Boolean(input.mobile || input.email), {
    message: "请至少填写手机或邮箱中的一项。",
    path: ["mobile"],
  });

const enterpriseApplicationReviewSchema = z.object({
  brandId: z.number().int().positive(),
  membershipId: z.number().int().positive(),
  approved: z.boolean(),
  reviewNote: z.string().trim().max(500).nullish(),
});

const siteContactUpdateSchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  contactScene: z.string().trim().min(1).optional(),
  headline: z.string().trim().max(255).nullish(),
  description: z.string().trim().max(4000).nullish(),
  primaryCtaLabel: z.string().trim().max(120).nullish(),
  primaryCtaHref: z.string().trim().max(500).nullish(),
  secondaryCtaLabel: z.string().trim().max(120).nullish(),
  secondaryCtaHref: z.string().trim().max(500).nullish(),
  contactEmail: z.string().trim().max(320).nullish(),
  contactPhone: z.string().trim().max(64).nullish(),
  contactWechat: z.string().trim().max(120).nullish(),
  contactAddress: z.string().trim().max(255).nullish(),
  serviceHours: z.string().trim().max(255).nullish(),
  responseSla: z.string().trim().max(120).nullish(),
});

const siteSolutionModuleInputSchema = z.object({
  title: z.string().trim().min(2).max(255),
  summary: z.string().trim().min(10).max(4000),
  audience: z.string().trim().max(255).nullish(),
  sortOrder: z.number().int().min(0).max(999).nullish(),
});

const siteCaseStudyInputSchema = z.object({
  title: z.string().trim().min(2).max(255),
  subtitle: z.string().trim().max(255).nullish(),
  summary: z.string().trim().min(10).max(4000),
  location: z.string().trim().max(120).nullish(),
  segment: z.string().trim().max(120).nullish(),
  partnerName: z.string().trim().max(255).nullish(),
  sortOrder: z.number().int().min(0).max(999).nullish(),
});

const siteSolutionModulesUpdateSchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  items: z.array(siteSolutionModuleInputSchema).min(1).max(8),
});

const siteCaseStudiesUpdateSchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  items: z.array(siteCaseStudyInputSchema).min(1).max(8),
});

const siteClientLogoInputSchema = z.object({
  clientName: z.string().trim().min(2).max(255),
  logoText: z.string().trim().min(1).max(32),
  tagline: z.string().trim().max(255).nullish(),
  accentColor: z.string().trim().max(32).nullish(),
  sortOrder: z.number().int().min(0).max(999).nullish(),
});

const siteClientLogosUpdateSchema = z.object({
  siteKey: platformSiteKeySchema,
  brandCode: z.string().trim().min(1).optional(),
  items: z.array(siteClientLogoInputSchema).min(1).max(12),
});

const fallbackBrands = [
  { id: 1, code: "huanxiduo", name: "环洗朵科技", shortName: "环洗朵", businessType: "b2b", status: "active" },
  { id: 2, code: "icloush-lab", name: "iCloush LAB.", shortName: "LAB", businessType: "hybrid", status: "active" },
  { id: 3, code: "icloush-care", name: "iCloush Care", shortName: "Care", businessType: "hybrid", status: "active" },
  { id: 4, code: "astro", name: "浣星司", shortName: "ASTRO", businessType: "hybrid", status: "active" },
] as const;

function requireDb<T>(db: T | null): T {
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "数据库当前不可用，请稍后重试。",
    });
  }

  return db;
}

function isAdminRole(role: string | undefined) {
  return role === "admin" || role === "super_admin";
}

function mapRetailGatewayToProvider(gateway: z.infer<typeof retailGatewaySchema>) {
  return gateway === "alipay_openapi" ? "alipay" : "wechat_jsapi";
}

type RetailPaymentMode = "sandbox" | "production_ready" | "production_live";

const RETAIL_PAYMENT_MODE_SPEC_KEY = "__retail_payment_mode";

function buildRetailNotifyUrl(origin: string | null | undefined, gateway: z.infer<typeof retailGatewaySchema>) {
  const base = origin?.replace(/\/+$/, "") || "https://preview.icloush.lab";
  return `${base}/api/orders/retail/callback/${gateway}`;
}

function extractRetailPaymentMode(specs: Array<{ key: string; value: string }>): RetailPaymentMode {
  const matched = specs.find((item) => item.key === RETAIL_PAYMENT_MODE_SPEC_KEY)?.value?.trim();
  return matched === "production_live" || matched === "production_ready" ? matched : "sandbox";
}

function getBillingCycleLabel(cycle: "weekly" | "monthly" | "quarterly" | undefined) {
  if (cycle === "weekly") {
    return "按周";
  }
  if (cycle === "quarterly") {
    return "按季";
  }
  return "按月";
}

function buildInstallmentPlanCode(productId: number, plan?: { id?: number; billingCycle?: "weekly" | "monthly" | "quarterly"; name?: string | null } | null) {
  const normalizedCycle = plan?.billingCycle ?? "monthly";
  const normalizedName = (plan?.name ?? "plan").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "plan";
  const normalizedId = typeof plan?.id === "number" ? String(plan.id) : normalizedName;
  return `RET-${productId}-${normalizedCycle}-${normalizedId}`.toUpperCase();
}

async function resolveRetailOrderProfile(params: {
  brandId: number;
  items: Array<{ productId: number; skuId: number; quantity: number }>;
  note?: string | null;
}) {
  const products = await Promise.all(
    params.items.map((item) => getManagedProductDetail({ id: item.productId, brandId: params.brandId })),
  );
  const modes = products.map((product) => extractRetailPaymentMode(product?.specs ?? []));
  const paymentMode = modes.includes("production_live")
    ? ("production_live" as const)
    : modes.includes("production_ready")
      ? ("production_ready" as const)
      : ("sandbox" as const);
  const productTypes = Array.from(new Set(products.map((product) => product?.productType ?? "physical")));

  if (productTypes.length > 1) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "当前订单暂不支持把零售、服务、租赁与订阅对象混合结算，请按单一交易类型分别下单。",
    });
  }

  const primaryType = productTypes[0] ?? "physical";
  const primaryProduct = products[0] ?? null;
  let paymentScenario: "full_payment" | "installment" | "offline_review" = paymentMode === "production_ready" ? "offline_review" : "full_payment";
  let installmentPlanCode: string | undefined;
  let appendedNote: string | null = null;

  if (primaryType === "subscription") {
    const subscriptionPlans = Array.isArray((primaryProduct as { subscriptionPlans?: Array<{ status?: string | null; billingCycle?: string | null; name?: string | null }> } | null)?.subscriptionPlans)
      ? ((primaryProduct as { subscriptionPlans?: Array<{ status?: string | null; billingCycle?: string | null; name?: string | null }> }).subscriptionPlans ?? [])
      : [];
    const activePlans = subscriptionPlans.filter((plan) => plan.status !== "inactive");
    const preferredPlan = activePlans.find((plan) => plan.billingCycle === "monthly") ?? activePlans[0] ?? null;
    paymentScenario = paymentMode === "production_ready" ? "offline_review" : "installment";
    installmentPlanCode = buildInstallmentPlanCode(primaryProduct?.id ?? params.items[0]?.productId ?? params.brandId, preferredPlan as never);
    appendedNote = preferredPlan
      ? `订阅计划：${preferredPlan.name}（${getBillingCycleLabel((preferredPlan.billingCycle as "weekly" | "monthly" | "quarterly" | undefined) ?? "monthly")}）`
      : "订阅计划：默认按月结算";
  } else if (primaryType === "rental") {
    appendedNote = "租赁方案：设备免押，需由顾问确认设备排期与月结账期。";
  } else if (primaryType === "service") {
    appendedNote = "服务方案：需由顾问确认交付范围、排期与服务节奏。";
  }

  const mergedNote = [params.note?.trim(), appendedNote].filter((entry): entry is string => Boolean(entry)).join("｜") || null;

  return {
    paymentMode,
    paymentScenario,
    installmentPlanCode,
    note: mergedNote,
    productType: primaryType,
  };
}

function buildRetailGatewayRequirements(gateway: z.infer<typeof retailGatewaySchema>) {
  return gateway === "wechat_pay_v3"
    ? [
        "WECHAT_PAY_MCHID",
        "WECHAT_PAY_APPID",
        "WECHAT_PAY_SERIAL_NO",
        "WECHAT_PAY_PRIVATE_KEY",
        "WECHAT_PAY_API_V3_KEY",
        "WECHAT_PAY_PLATFORM_CERT_PATH_OR_PUBLIC_KEY",
      ]
    : ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_PUBLIC_KEY", "ALIPAY_NOTIFY_URL", "ALIPAY_SIGN_TYPE"];
}

function buildSandboxGatewayResult(params: {
  gateway: z.infer<typeof retailGatewaySchema>;
  brandId: number;
  orderId: number;
  orderNo: string;
  amount: number;
  currency: string;
}) {
  return {
    gateway: params.gateway,
    stage: "completed" as const,
    providerOrderId: `sandbox-${params.orderNo}`,
    clientPayload: {
      mode: "sandbox",
      orderNo: params.orderNo,
      expectedSettlementMs: 0,
      result: "payment_succeeded",
      fulfillmentStage: "awaiting_fulfillment",
    },
    requiredConfigs: [],
    requestSnapshot: {
      brandId: params.brandId,
      orderId: params.orderId,
      orderNo: params.orderNo,
      amount: params.amount,
      currency: params.currency,
    },
    notes: ["当前商品处于 SANDBOX 模式，系统不会访问正式支付网关；库存已预占、模拟支付已成功，订单现进入待发货队列。"],
  };
}

function buildProductionReadyGatewayResult(params: {
  gateway: z.infer<typeof retailGatewaySchema>;
  brandId: number;
  orderId: number;
  orderNo: string;
  amount: number;
  currency: string;
}) {
  return {
    gateway: params.gateway,
    stage: "ready_for_sdk" as const,
    providerOrderId: null,
    clientPayload: {
      mode: "production_ready",
      nextStep: "等待备案、证书与正式支付参数注入后切换到 production_live",
    },
    requiredConfigs: buildRetailGatewayRequirements(params.gateway),
    requestSnapshot: {
      brandId: params.brandId,
      orderId: params.orderId,
      orderNo: params.orderNo,
      amount: params.amount,
      currency: params.currency,
    },
    notes: ["当前商品已切到 PRODUCTION READY：下单不会自动沙盒结算，系统保留正式支付所需配置清单与联调状态。"],
  };
}

const retailRouter = router({
  retailSnapshot: publicProcedure.query(async () => {
    return getPlatformSnapshot();
  }),
  retailCatalog: publicProcedure.query(async () => {
    return getPublicCatalog();
  }),
  galleryObjects: publicProcedure.input(managedProductListSchema).query(async ({ input }) => {
    return listManagedProducts(input);
  }),
  objectDetail: publicProcedure.input(managedProductDetailSchema).query(async ({ input }) => {
    const product = await getManagedProductDetail(input);
    if (!product) {
      throw new Error("未找到对应商品。");
    }
    return product;
  }),
  createRetailOrder: protectedProcedure.input(retailCreateOrderSchema).mutation(async ({ ctx, input }) => {
    const db = requireDb(await getDb());
    const retailProfile = await resolveRetailOrderProfile({
      brandId: input.brandId,
      items: input.items,
      note: input.note ?? null,
    });
    const created = await createOrder({
      db,
      brandId: input.brandId,
      userId: ctx.user.id,
      customerType: "b2c",
      note: retailProfile.note,
      currency: input.currency,
      customization: input.customization ?? null,
      logistics: input.logistics ?? null,
      items: input.items,
      payment: {
        provider: mapRetailGatewayToProvider(input.gateway),
        gateway: input.gateway,
        paymentMode: retailProfile.paymentMode,
        paymentScenario: retailProfile.paymentScenario,
        installmentPlanCode: retailProfile.installmentPlanCode,
      },
      sandbox: {
        autoSettle: false,
        outcome: "successful",
      },
    });

    const sandboxSettlement = retailProfile.paymentMode === "sandbox"
      ? await settleSandboxOrderPayment({
          db,
          brandId: input.brandId,
          orderId: created.order.id,
          paymentId: created.payment.id,
          outcome: "successful",
        })
      : null;
    const resolvedOrder = sandboxSettlement?.order ?? created.order;
    const resolvedPayment = sandboxSettlement?.payment ?? created.payment;

    const paymentBrandLabel =
      fallbackBrands.find((brand) => brand.id === input.brandId)?.shortName ??
      fallbackBrands.find((brand) => brand.id === input.brandId)?.name ??
      `Brand ${input.brandId}`;
    const paymentDescription = `${paymentBrandLabel} ${created.items.map((item) => item.product.name).join(" / ")}`.slice(0, 120);
    const gateway =
      retailProfile.paymentMode === "sandbox"
        ? buildSandboxGatewayResult({
            gateway: input.gateway,
            brandId: input.brandId,
            orderId: resolvedOrder.id,
            orderNo: resolvedOrder.orderNo,
            amount: resolvedOrder.payableAmount,
            currency: resolvedOrder.currency,
          })
        : retailProfile.paymentMode === "production_ready"
          ? buildProductionReadyGatewayResult({
              gateway: input.gateway,
              brandId: input.brandId,
              orderId: created.order.id,
              orderNo: created.order.orderNo,
              amount: created.order.payableAmount,
              currency: created.order.currency,
            })
          : await createPaymentOrder({
              gateway: input.gateway,
              brandId: input.brandId,
              orderId: created.order.id,
              orderNo: created.order.orderNo,
              amount: created.order.payableAmount,
              currency: created.order.currency,
              description: paymentDescription,
              notifyUrl: buildRetailNotifyUrl(input.origin, input.gateway),
              returnUrl: input.returnUrl ?? null,
              payer: input.payerOpenId ? { openId: input.payerOpenId } : undefined,
              metadata: {
                paymentId: created.payment.id,
                userId: ctx.user.id,
                channel: "web-b2b-retail",
                paymentMode: retailProfile.paymentMode,
                productType: retailProfile.productType,
                paymentScenario: retailProfile.paymentScenario,
                installmentPlanCode: retailProfile.installmentPlanCode ?? null,
              },
            });

    return {
      tenant: { brandId: input.brandId },
      order: resolvedOrder,
      items: created.items,
      payment: resolvedPayment,
      paymentMode: retailProfile.paymentMode,
      logisticsCompliance: created.logisticsCompliance,
      gateway,
      paymentPolling: {
        orderId: resolvedOrder.id,
        orderNo: resolvedOrder.orderNo,
        recommendedIntervalMs: retailProfile.paymentMode === "sandbox" ? 0 : 5000,
        sandboxExpectedSettlementMs: retailProfile.paymentMode === "sandbox" ? 0 : null,
      },
    };
  }),
  retailOrderStatus: protectedProcedure.input(retailOrderStatusSchema).query(async ({ ctx, input }) => {
    const db = requireDb(await getDb());
    const detail = await getOrderDetail({
      db,
      brandId: input.brandId,
      orderId: input.orderId,
      orderNo: input.orderNo,
    });

    if (!isAdminRole(ctx.user.globalRole) && detail.summary.userId !== ctx.user.id) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "当前用户无权查看该零售订单。",
      });
    }

    const latestPayment = detail.summary.latestPayment ?? detail.payments[0] ?? null;
    const latestPaymentMeta =
      latestPayment?.metaJson && typeof latestPayment.metaJson === "object" && !Array.isArray(latestPayment.metaJson)
        ? (latestPayment.metaJson as Record<string, unknown>)
        : null;
    const paymentMode =
      latestPaymentMeta?.paymentMode === "production_ready" || latestPaymentMeta?.paymentMode === "production_live"
        ? latestPaymentMeta.paymentMode
        : "sandbox";
    const paymentGateway = typeof latestPaymentMeta?.paymentGateway === "string" ? latestPaymentMeta.paymentGateway : null;
    const transactionState =
      detail.summary.paymentStatus === "paid"
        ? "successful"
        : detail.summary.status === "cancelled" || detail.summary.status === "closed"
          ? "closed"
          : "pending";
    const paymentGatewayStage =
      transactionState !== "pending"
        ? null
        : paymentMode === "production_ready"
          ? "ready_for_sdk"
          : paymentMode === "production_live"
            ? "processing"
            : "processing";

    return {
      tenant: { brandId: input.brandId },
      summary: detail.summary,
      latestPayment,
      paymentMode,
      paymentGateway,
      paymentGatewayStage,
      transactionState,
      terminal: transactionState !== "pending",
      prompt:
        transactionState === "successful"
          ? "// TRANSACTION SUCCESSFUL //"
          : transactionState === "closed"
            ? "// TRANSACTION CLOSED //"
            : paymentMode === "production_ready"
              ? "// PAYMENT CHANNEL PREPARING FOR PRODUCTION //"
              : paymentMode === "production_live"
                ? "// WAITING FOR OFFICIAL PAYMENT CALLBACK //"
                : "// WAITING FOR PAYMENT CONFIRMATION //",
    };
  }),
});

export const appRouter = router({
  system: systemRouter,
  bingzhu: router({
    catalog: publicProcedure.query(async () => getBingzhuCatalog()),
  }),
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  brands: router({
    list: publicProcedure.query(async () => {
      const db = await getDb();

      if (!db) {
        return fallbackBrands;
      }

      const records = await db
        .select({
          id: brands.id,
          code: brands.code,
          name: brands.name,
          shortName: brands.shortName,
          businessType: brands.businessType,
          status: brands.status,
        })
        .from(brands);

      return records.length > 0 ? records : fallbackBrands;
    }),
  }),
  retail: retailRouter,
  platform: retailRouter,
  site: router({
    contactConfig: publicProcedure.input(siteContactQuerySchema).query(async ({ input }) => {
      return getSiteContactConfig(input);
    }),
    solutionModules: publicProcedure.input(siteSolutionModulesQuerySchema).query(async ({ input }) => {
      return listSiteSolutionModules(input);
    }),
    caseStudies: publicProcedure.input(siteCaseStudiesQuerySchema).query(async ({ input }) => {
      return listSiteCaseStudies(input);
    }),
    clientLogos: publicProcedure.input(siteClientLogosQuerySchema).query(async ({ input }) => {
      return listSiteClientLogos(input);
    }),
    submitLead: publicProcedure.input(siteLeadSubmissionSchema).mutation(async ({ input }) => {
      const receipt = await submitSiteLead(input);
      let notificationDelivered = false;

      try {
        notificationDelivered = await notifyOwner({
          title: `[${input.siteKey.toUpperCase()}] 新咨询线索`,
          content: [
            `联系人：${input.contactName}`,
            input.companyName ? `单位：${input.companyName}` : null,
            input.mobile ? `手机：${input.mobile}` : null,
            input.email ? `邮箱：${input.email}` : null,
            typeof input.roomCount === "number" ? `房量：${input.roomCount}` : null,
            input.laundryVolume ? `洗涤量：${input.laundryVolume}` : null,
            input.message ? `需求说明：${input.message}` : null,
            `来源页面：${input.sourcePage?.trim() || `/${input.siteKey}`}`,
            `写入结果：${receipt.source === "database" ? "已写入 leads 表" : "当前为回退模式"}`,
          ]
            .filter(Boolean)
            .join("\n"),
        });
      } catch (error) {
        console.warn("[Notification] Failed to notify owner for site lead:", error);
      }

      return {
        ...receipt,
        notificationDelivered,
      };
    }),
    myEnterpriseApplications: protectedProcedure.input(enterpriseApplicationQuerySchema).query(async ({ ctx, input }) => {
      return listEnterpriseApplicationsByUser({
        userId: ctx.user.id,
        brandId: input.brandId,
      });
    }),
    submitEnterpriseApplication: protectedProcedure
      .input(enterpriseApplicationSubmissionSchema)
      .mutation(async ({ ctx, input }) => {
        const receipt = await submitEnterpriseApplicationToDb({
          ...input,
          userId: ctx.user.id,
        });
        let notificationDelivered = false;

        try {
          notificationDelivered = await notifyOwner({
            title: `[${receipt.brandCode.toUpperCase()}] 新企业入驻申请`,
            content: [
              `申请人：${input.contactName}`,
              `企业名称：${input.enterpriseName}`,
              input.mobile ? `手机：${input.mobile}` : null,
              input.email ? `邮箱：${input.email}` : null,
              input.message ? `申请说明：${input.message}` : null,
              `来源页面：${input.sourcePage?.trim() || "/account"}`,
              `申请状态：${receipt.membershipStatus}`,
              `写入结果：${receipt.source === "database" ? "已写入 membership 与 leads" : "当前为回退模式"}`,
            ]
              .filter(Boolean)
              .join("\n"),
          });
        } catch (error) {
          console.warn("[Notification] Failed to notify owner for enterprise application:", error);
        }

        return {
          ...receipt,
          notificationDelivered,
        };
      }),
    updateContactConfig: adminProcedure.input(siteContactUpdateSchema).mutation(async ({ input }) => {
      return upsertSiteContactConfig(input);
    }),
    updateSolutionModules: adminProcedure.input(siteSolutionModulesUpdateSchema).mutation(async ({ input }) => {
      return replaceSiteSolutionModules(input);
    }),
    updateCaseStudies: adminProcedure.input(siteCaseStudiesUpdateSchema).mutation(async ({ input }) => {
      return replaceSiteCaseStudies(input);
    }),
    updateClientLogos: adminProcedure.input(siteClientLogosUpdateSchema).mutation(async ({ input }) => {
      return replaceSiteClientLogos(input);
    }),
  }),
  admin: router({
    operations: adminProcedure.input(adminOperationsSchema).query(async ({ input }) => {
      return getAdminOperationsSnapshot(input);
    }),
    reviewEnterpriseApplication: adminProcedure
      .input(enterpriseApplicationReviewSchema)
      .mutation(async ({ ctx, input }) => {
        const result = await reviewEnterpriseApplicationInDb({
          brandId: input.brandId,
          membershipId: input.membershipId,
          approved: input.approved,
          reviewedBy: ctx.user.id,
          reviewNote: input.reviewNote ?? null,
        });

        return {
          tenant: { brandId: input.brandId },
          ...result,
        };
      }),
  }),
  orders: router({
    list: adminProcedure.input(adminOrderFilterSchema).query(async ({ input }) => {
      const db = requireDb(await getDb());
      const result = await listOrders({
        db,
        brandId: input.brandId,
        orderId: input.orderId,
        orderNo: input.orderNo,
        status: input.status,
        paymentStatus: input.paymentStatus,
        fulfillmentStatus: input.fulfillmentStatus,
        limit: input.limit,
      });

      return {
        tenant: { brandId: input.brandId },
        filters: input,
        ...result,
      };
    }),
    myList: protectedProcedure.input(myOrderFilterSchema).query(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const result = await listOrders({
        db,
        brandId: input.brandId,
        userId: ctx.user.id,
        status: input.status,
        paymentStatus: input.paymentStatus,
        fulfillmentStatus: input.fulfillmentStatus,
        limit: input.limit,
      });

      return {
        tenant: { brandId: input.brandId },
        filters: input,
        ...result,
      };
    }),
    detail: protectedProcedure.input(orderDetailSchema).query(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const detail = await getOrderDetail({
        db,
        brandId: input.brandId,
        orderId: input.orderId,
        orderNo: input.orderNo,
      });

      if (!isAdminRole(ctx.user.globalRole) && detail.summary.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "当前用户无权查看该订单。",
        });
      }

      return {
        tenant: { brandId: input.brandId },
        ...detail,
      };
    }),
    reviewQueue: adminProcedure.input(reviewQueueSchema).query(async ({ input }) => {
      const db = requireDb(await getDb());
      const result = await listOrderReviewQueue({
        db,
        brandId: input.brandId,
        reviewStatus: input.reviewStatus,
        orderId: input.orderId,
        orderNo: input.orderNo,
        paymentId: input.paymentId,
        receiptId: input.receiptId,
        reviewedBy: input.reviewedBy,
        limit: input.limit,
      });

      return {
        tenant: { brandId: input.brandId },
        filters: input,
        ...result,
      };
    }),
    reviewPayment: adminProcedure.input(reviewPaymentSchema).mutation(async ({ ctx, input }) => {
      const db = requireDb(await getDb());
      const result = await reviewOrderPayment({
        db,
        brandId: input.brandId,
        orderId: input.orderId,
        paymentId: input.paymentId,
        receiptId: input.receiptId,
        approved: input.approved,
        reviewedBy: ctx.user.id,
        reviewNote: input.reviewNote ?? null,
      });

      return {
        tenant: { brandId: input.brandId },
        ...result,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
