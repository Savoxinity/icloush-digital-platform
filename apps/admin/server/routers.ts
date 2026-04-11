import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { brands } from "../../../packages/database/schema";
import {
  getOrderDetail,
  listOrderReviewQueue,
  listOrders,
  reviewOrderPayment,
} from "../../../packages/oms/src/index";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { notifyOwner } from "./_core/notification";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  getAdminOperationsSnapshot,
  getDb,
  getPlatformSnapshot,
  getPublicCatalog,
  getSiteContactConfig,
  listEnterpriseApplicationsByUser,
  listSiteCaseStudies,
  listSiteSolutionModules,
  replaceSiteCaseStudies,
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

const platformSiteKeySchema = z.enum(["shop", "lab", "tech", "care"]);

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

const fallbackBrands = [
  { id: 1, code: "huanxiduo", name: "环洗朵科技", shortName: "环洗朵", businessType: "b2b", status: "active" },
  { id: 2, code: "icloush-lab", name: "iCloush LAB.", shortName: "LAB", businessType: "hybrid", status: "active" },
  { id: 3, code: "icloush-care", name: "iCloush Care", shortName: "Care", businessType: "hybrid", status: "active" },
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

export const appRouter = router({
  system: systemRouter,
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
  platform: router({
    snapshot: publicProcedure.query(async () => {
      return getPlatformSnapshot();
    }),
    catalog: publicProcedure.query(async () => {
      return getPublicCatalog();
    }),
  }),
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
