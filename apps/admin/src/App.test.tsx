import fs from "node:fs";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./_core/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: 7, name: "测试管理员" },
    loading: false,
    isAuthenticated: true,
    logout: vi.fn(),
  }),
}));

vi.mock("./lib/trpc", () => {
  const createQuery = (data: unknown | ((input?: unknown) => unknown)) => ({
    useQuery: (input?: unknown) => ({
      data: typeof data === "function" ? data(input) : data,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  });

  const createMutation = () => ({
    useMutation: () => ({
      mutate: vi.fn(),
      mutateAsync: vi.fn(),
      isPending: false,
      error: null,
      reset: vi.fn(),
    }),
  });

  return {
    trpc: {
      brands: {
        list: createQuery([
          { id: 1, code: "icloush-lab", name: "iCloush LAB." },
          { id: 2, code: "tech", name: "环洗朵科技" },
        ]),
      },
      platform: {
        snapshot: createQuery({
          generatedAt: "2026-04-10T18:00:00.000Z",
          totals: {
            siteCount: 4,
            brandCount: 3,
            capabilityCount: 6,
            productCount: 12,
            categoryCount: 6,
            orderCount: 9,
            leadCount: 5,
          },
          siteSummaries: [
            {
              siteKey: "shop",
              title: "B2B 商城系统",
              brandName: "统一商城",
              brandCodes: ["lab", "tech", "care"],
              productCount: 5,
              categoryCount: 3,
              orderCount: 4,
              pipelineOrderCount: 2,
              leadCount: 2,
              highlightNames: ["实验室净洗方案", "酒店布草奢护方案"],
            },
            {
              siteKey: "lab",
              title: "iCloush LAB.",
              brandName: "iCloush LAB.",
              brandCodes: ["lab"],
              productCount: 3,
              categoryCount: 1,
              orderCount: 2,
              pipelineOrderCount: 1,
              leadCount: 1,
              highlightNames: ["实验室净洗方案", "高端消费洗护延展产品线"],
            },
            {
              siteKey: "tech",
              title: "环洗朵科技",
              brandName: "环洗朵科技",
              brandCodes: ["tech"],
              productCount: 2,
              categoryCount: 1,
              orderCount: 2,
              pipelineOrderCount: 1,
              leadCount: 1,
              highlightNames: ["物业项目标准化清洁剂替换方案", "商办空间玻璃与硬表面清洁提效"],
            },
            {
              siteKey: "care",
              title: "iCloush Care",
              brandName: "iCloush Care",
              brandCodes: ["care"],
              productCount: 2,
              categoryCount: 1,
              orderCount: 1,
              pipelineOrderCount: 1,
              leadCount: 1,
              highlightNames: ["酒店布草奢护方案", "服务式公寓织物护理"],
            },
          ],
          accountSummary: {
            orderCount: 4,
            pendingOrderCount: 2,
            pendingReviewCount: 1,
            actionCount: 3,
          },
          adminSummary: {
            brandCount: 3,
            reviewQueueCount: 1,
            leadCount: 5,
            moduleCount: 6,
          },
        }),
        catalog: createQuery({
        source: "database",
          generatedAt: "2026-04-10T18:00:00.000Z",
          categories: [
            {
              id: 201,
              slug: "chemicals",
              name: "专业清洁剂",
              brandCode: "tech",
              brandName: "环洗朵科技",
              productCount: 2,
            },
            {
              id: 202,
              slug: "lab-consumables",
              name: "实验室耗材",
              brandCode: "lab",
              brandName: "iCloush LAB.",
              productCount: 1,
            },
          ],
          products: [
            {
              id: 301,
              slug: "surface-cleaner-pro",
              name: "硬表面清洁浓缩液",
              brandCode: "tech",
              brandName: "环洗朵科技",
              categorySlug: "chemicals",
              categoryName: "专业清洁剂",
              subtitle: "适用于物业、商办与公共空间。",
              description: "支持高频清洁与标准化替换。",
              productType: "sku",
              status: "active",
              specLabel: "4L / 桶",
              minimumOrderLabel: "20 桶起订",
              leadTimeLabel: "5-7 个工作日",
              priceLabel: "项目报价",
              priceValue: null,
              badges: ["商办空间", "可追溯批次"],
            },
            {
              id: 302,
              slug: "lab-rinse-kit",
              name: "实验室净洗试剂组套",
              brandCode: "lab",
              brandName: "iCloush LAB.",
              categorySlug: "lab-consumables",
              categoryName: "实验室耗材",
              subtitle: "用于实验室验证与样板测试。",
              description: "覆盖配方验证与净洗测试流程。",
              productType: "solution",
              status: "active",
              specLabel: "Starter Kit",
              minimumOrderLabel: "1 套起订",
              leadTimeLabel: "顾问确认后排期",
              priceLabel: "顾问报价",
              priceValue: null,
              badges: ["顾问式交付", "实验室验证"],
            },
          ],
        }),
      },
      site: {
        contactConfig: createQuery((input?: { siteKey?: string }) =>
          input?.siteKey === "care"
            ? {
                siteKey: "care",
                headline: "联系 iCloush 团队",
                description: "由品牌顾问统一承接需求诊断、样品寄送与合作排期。",
                primaryContactName: "品牌顾问团队",
                primaryContactRole: "客户成功",
                mobile: "400-820-2026",
                phone: null,
                email: "care@icloush.com",
                wechat: "iCloushCare",
                address: "上海市静安区协作路 88 号",
                serviceHours: "周一至周六 09:00-18:00",
                mapLabel: "iCloush 服务中心",
                note: "测试环境默认联系信息。",
                ctaLabel: "预约咨询",
              }
            : {
                siteKey: "lab",
                contactScene: "business",
                source: "database",
                headline: "为合作、研发共创与技术交流提供可执行的咨询路径",
                description: "支持经销合作、联合研发、样品打样与场景测试沟通，线索将进入统一后台进行跟进与归档。",
                primaryCtaLabel: "提交合作需求",
                primaryCtaHref: "/account",
                secondaryCtaLabel: "LAB 共创需求单",
                secondaryCtaHref: "/shop",
                contactEmail: "lab@icloush.com",
                contactPhone: "400-820-2026",
                contactWechat: "iCloushLAB",
                contactAddress: "上海市闵行区研发协同中心 3F",
                serviceHours: "周一至周五 09:00-18:00",
                responseSla: "1 个工作日内答复",
              },
        ),
        solutionModules: createQuery((input?: { siteKey?: string }) =>
          input?.siteKey === "tech"
            ? {
                source: "database",
                items: [
                  {
                    id: 11,
                    siteKey: "tech",
                    title: "酒店布草与客房织物清洁方案",
                    summary: "围绕客房布草、餐饮织物与高频补货场景配置预洗、主洗、柔护与异味控制建议。",
                    audience: "酒店后勤、外包洗涤团队",
                    sortOrder: 1,
                  },
                  {
                    id: 12,
                    siteKey: "tech",
                    title: "物业与商业空间硬表面清洁方案",
                    summary: "覆盖石材、金属、玻璃与公共区域高频触点，强调低残留、标准稀释比例与班次化补货机制。",
                    audience: "物业项目、商办空间班组",
                    sortOrder: 2,
                  },
                ],
              }
            : {
                source: "fallback",
                items: [],
              },
        ),
        caseStudies: createQuery((input?: { siteKey?: string }) =>
          input?.siteKey === "tech"
            ? {
                source: "database",
                items: [
                  {
                    id: 21,
                    siteKey: "tech",
                    title: "物业项目标准化清洁剂替换方案",
                    subtitle: "从多品牌混用切换到标准配比与集中采购。",
                    summary: "结合采购预算与现场作业反馈，以标准配比、集中采购与巡检抽样方式替换旧有多品牌混用模式。",
                    partnerName: "华东商办物业联合体",
                    location: "上海",
                    segment: "物业",
                    metrics: [],
                    tags: ["物业", "标准化替换"],
                    imageUrl: null,
                    sortOrder: 1,
                  },
                ],
              }
            : {
                source: "database",
                items: [
                  {
                    id: 1,
                    siteKey: "care",
                    title: "高端酒店布草奢护方案",
                    subtitle: "覆盖客房、餐饮与康体区布草护理节奏。",
                    summary: "通过周转监控与护理 SOP 降低返洗率。",
                    partnerName: "上海静安艺廊酒店",
                    location: "上海",
                    segment: "高端酒店",
                    metrics: ["平均返洗率下降 18%", "旺季排班效率提升 22%"],
                    tags: ["酒店", "布草护理"],
                    imageUrl: null,
                    sortOrder: 1,
                  },
                ],
              },
        ),
        clientLogos: createQuery((input?: { siteKey?: string }) =>
          input?.siteKey === "tech"
            ? {
                source: "database",
                items: [
                  {
                    id: 41,
                    siteKey: "tech",
                    clientName: "华东商办物业联合体",
                    logoText: "HUADONG PM",
                    tagline: "商办物业标准化采购客户",
                    accentColor: "#0f766e",
                    sortOrder: 1,
                  },
                  {
                    id: 42,
                    siteKey: "tech",
                    clientName: "嘉衡酒店管理集团",
                    logoText: "JIAHENG HOTEL",
                    tagline: "酒店布草与客房清洁合作项目",
                    accentColor: "#1d4ed8",
                    sortOrder: 2,
                  },
                ],
              }
            : {
                source: "fallback",
                items: [],
              },
        ),
        myEnterpriseApplications: createQuery([
          {
            brandId: 1,
            brandName: "iCloush LAB.",
            enterpriseName: "上海研净实验室",
            contactName: "陈工",
            memberType: "enterprise",
            status: "pending",
            createdAt: "2026-04-10T09:00:00.000Z",
            updatedAt: "2026-04-10T09:00:00.000Z",
          },
          {
            brandId: 1,
            brandName: "iCloush LAB.",
            enterpriseName: "苏州净研科技",
            contactName: "王经理",
            memberType: "enterprise",
            status: "approved",
            createdAt: "2026-04-08T09:00:00.000Z",
            updatedAt: "2026-04-09T09:00:00.000Z",
          },
          {
            brandId: 1,
            brandName: "iCloush LAB.",
            enterpriseName: "杭州净护实验室",
            contactName: "赵主管",
            memberType: "enterprise",
            status: "rejected",
            createdAt: "2026-04-06T09:00:00.000Z",
            updatedAt: "2026-04-07T09:00:00.000Z",
          },
        ]),
        submitEnterpriseApplication: createMutation(),
        submitLead: createMutation(),
        updateContactConfig: createMutation(),
        updateSolutionModules: createMutation(),
        updateCaseStudies: createMutation(),
        updateClientLogos: createMutation(),
      },
      admin: {
        reviewEnterpriseApplication: createMutation(),
        managedProducts: createQuery({
          generatedAt: "2026-04-18T18:05:00.000Z",
          source: "database",
          brandId: 1,
          brandCode: "icloush-lab",
          brandName: "iCloush LAB.",
          filters: {
            series: "all",
            status: "all",
          },
          products: [
            {
              id: 9101,
              brandId: 1,
              brandCode: "icloush-lab",
              brandName: "iCloush LAB.",
              code: "VOID-B03",
              name: "大气重组基质",
              slug: "void-b03",
              series: "AP",
              price: 1280,
              status: "active",
              imageUrl: "/manus-storage/icloush/void-b03.png",
              subtitle: "Atmospheric Purification / Brutal showroom hero asset",
              description: "以高张力叙事承接除味、重组与空间净化场景。",
              specs: [
                { key: "除味率", value: "99.2%" },
                { key: "核心成分", value: "冷凝植物复合因子" },
              ],
              updatedAt: "2026-04-18T18:00:00.000Z",
            },
          ],
        }),
        upsertProduct: createMutation(),
        uploadProductImage: createMutation(),
        operations: createQuery({
          generatedAt: "2026-04-10T18:05:00.000Z",
          scope: {
            brandId: 1,
            brandCode: "icloush-lab",
            brandName: "iCloush LAB.",
            isGlobal: false,
          },
          products: {
            totals: {
              productCount: 6,
              activeCount: 4,
              draftCount: 2,
              categoryCount: 3,
              seoReadyCount: 4,
              contentReadyCount: 3,
            },
            products: [
              {
                id: 11,
                brandId: 1,
                brandName: "iCloush LAB.",
                categoryName: "实验室方案",
                name: "实验室净洗方案",
                subtitle: "覆盖配方验证、场景测试与顾问式交付。",
                productType: "solution",
                status: "active",
                seoReady: true,
                contentReady: true,
                updatedAt: "2026-04-10T12:00:00.000Z",
              },
            ],
            brandViews: [
              {
                brandId: 1,
                brandName: "iCloush LAB.",
                productCount: 6,
                activeCount: 4,
                categoryCount: 3,
                seoReadyCount: 4,
                productTypeMix: ["solution", "service"],
              },
            ],
            alerts: ["仍有 2 个商品处于草稿态，建议优先补齐副标题与内容字段。"],
          },
          customers: {
            totals: {
              membershipCount: 5,
              activeMembershipCount: 4,
              pendingMembershipCount: 1,
              enterpriseAccountCount: 3,
              leadCount: 4,
              qualifiedLeadCount: 2,
            },
            customers: [
              {
                membershipId: 31,
                brandId: 1,
                brandName: "iCloush LAB.",
                userId: 501,
                displayName: "上海研净实验室",
                enterpriseName: "上海研净实验室",
                contactName: "陈工",
                memberType: "enterprise",
                status: "active",
                priceLevel: "tier_pending_assignment",
                email: "lab@example.com",
                mobile: "13800000000",
                accountType: "enterprise",
                globalRole: "user",
                lastSignedIn: "2026-04-09T10:00:00.000Z",
              },
              {
                membershipId: 32,
                brandId: 1,
                brandName: "iCloush LAB.",
                userId: 502,
                displayName: "广州净洗科技",
                enterpriseName: "广州净洗科技",
                contactName: "李经理",
                memberType: "enterprise",
                status: "pending",
                priceLevel: "tier_pending_assignment",
                email: "lead@example.com",
                mobile: "13900000000",
                accountType: "enterprise",
                globalRole: "user",
                lastSignedIn: "2026-04-10T08:30:00.000Z",
              },
            ],
            leads: [
              {
                id: 71,
                brandId: 1,
                brandName: "iCloush LAB.",
                sourceSite: "lab",
                sourcePage: "/lab/contact",
                companyName: "广州净洗科技",
                contactName: "李经理",
                leadStatus: "qualified",
                email: "lead@example.com",
                mobile: "13900000000",
                createdAt: "2026-04-08T10:00:00.000Z",
              },
            ],
            brandViews: [
              {
                brandId: 1,
                brandName: "iCloush LAB.",
                membershipCount: 5,
                activeMembershipCount: 4,
                enterpriseAccountCount: 3,
                leadCount: 4,
                qualifiedLeadCount: 2,
              },
            ],
            alerts: ["已有 2 条高意向线索进入 qualified 阶段，建议同步到客户跟进节奏。"],
          },
          content: {
            totals: {
              siteCount: 4,
              storyReadyCount: 3,
              seoReadySiteCount: 2,
              productStoryCount: 4,
              leadCaptureCount: 4,
            },
            siteEntries: [
              {
                siteKey: "lab",
                title: "iCloush LAB.",
                brandName: "iCloush LAB.",
                domain: "lab.icloush.com",
                storyReady: true,
                seoReady: true,
                leadCount: 2,
                featuredNames: ["实验室净洗方案"],
                statusLabel: "品牌叙事已就绪",
              },
            ],
            queue: [
              {
                title: "补齐 LAB 样品申请页",
                channel: "品牌官网",
                reason: "当前高意向线索已增长，建议补齐咨询承接内容。",
                priority: "high",
              },
            ],
            alerts: ["仍有 1 个站点尚未补齐品牌叙事，建议优先完成内容治理。"],
          },
          seo: {
            totals: {
              siteMetaReadyCount: 2,
              productMetaReadyCount: 4,
              activeProductCount: 4,
              missingMetaCount: 2,
            },
            siteEntries: [
              {
                siteKey: "lab",
                title: "iCloush LAB.",
                brandName: "iCloush LAB.",
                domain: "lab.icloush.com",
                activeProductCount: 4,
                seoReadyProductCount: 3,
                siteMetaReady: true,
                statusLabel: "站点元信息已就绪",
              },
            ],
            opportunities: [
              {
                title: "补齐实验室净洗方案元描述",
                impact: "当前核心商品仍缺少稳定的搜索摘要。",
                action: "补充 title / description 字段",
                severity: "high",
              },
            ],
            alerts: ["当前仍有 2 项元信息待补齐，建议优先处理高流量商品。"],
          },
        }),
      },
      orders: {
        myList: createQuery({
          total: 1,
          records: [
            {
              id: 101,
              orderNo: "ORD-1-ME-001",
              status: "processing",
              paymentStatus: "paid",
              fulfillmentStatus: "processing",
              payableAmount: 128800,
              itemPreview: [
                {
                  productName: "酒店布草清洗方案",
                  skuLabel: "季度包",
                  quantity: 1,
                },
              ],
              latestReceipt: { reviewStatus: "approved" },
            },
          ],
        }),
        detail: createQuery({
          summary: {
            orderNo: "ORD-1-ME-001",
            paymentStatus: "paid",
            fulfillmentStatus: "processing",
          },
        }),
        list: createQuery({
          total: 2,
          records: [
            {
              id: 101,
              orderNo: "ORD-1-ADMIN-001",
              status: "under_review",
              paymentStatus: "offline_review",
              fulfillmentStatus: "unfulfilled",
              payableAmount: 398000,
              itemPreview: [
                {
                  productName: "洗护耗材组合",
                  skuLabel: "企业标准版",
                  quantity: 2,
                },
              ],
              latestReceipt: { reviewStatus: "pending" },
            },
            {
              id: 102,
              orderNo: "ORD-1-ADMIN-002",
              status: "processing",
              paymentStatus: "paid",
              fulfillmentStatus: "processing",
              payableAmount: 268000,
              itemPreview: [
                {
                  productName: "实验室净洗方案",
                  skuLabel: "月度订阅",
                  quantity: 1,
                },
              ],
              latestReceipt: { reviewStatus: "approved" },
            },
          ],
        }),
        reviewQueue: createQuery({
          total: 1,
          records: [
            {
              reviewStatus: "pending",
              payment: { id: 801 },
              receipt: { id: 901 },
              order: {
                id: 101,
                orderNo: "ORD-1-QUEUE-001",
                payableAmount: 398000,
                itemPreview: [
                  {
                    productName: "洗护耗材组合",
                    skuLabel: "企业标准版",
                    quantity: 2,
                  },
                ],
              },
            },
          ],
        }),
        reviewPayment: {
          useMutation: () => ({
            mutate: vi.fn(),
            isPending: false,
          }),
        },
      },
      useUtils: () => ({
        admin: {
          operations: { invalidate: vi.fn(async () => undefined) },
          managedProducts: { invalidate: vi.fn(async () => undefined) },
        },
        platform: {
          showroomProducts: { invalidate: vi.fn(async () => undefined) },
        },
        site: {
          myEnterpriseApplications: { invalidate: vi.fn(async () => undefined) },
          clientLogos: { invalidate: vi.fn(async () => undefined) },
        },
        orders: {
          list: { invalidate: vi.fn(async () => undefined) },
          reviewQueue: { invalidate: vi.fn(async () => undefined) },
        },
      }),
    },
  };
});

import {
  AdminContent,
  AccountPage,
  CarePage,
  LabPage,
  PlatformHome,
  ShopPage,
  TechPage,
  buildHomepageEntrySnapshots,
  buildLabContactConfigPayload,
  formatMetricValue,
  getCatalogSourceCode,
  getLabContactUpdateErrorMessage,
  getLabContactUpdateSuccessMessage,
  mapCatalogCategories,
  mapCatalogProducts,
  resolveCatalogState,
  resolveSeoConfig,
  resolveSnapshotState,
  submitLabContactConfigUpdate,
  syncEnterpriseApplicationReviewAfterSave,
  syncLabContactConfigAfterSave,
} from "./App";
import { trpc } from "./lib/trpc";

function setPathname(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: { pathname, search: "", hash: "" },
    configurable: true,
  });
}

function withCatalogQueryOverride(useQuery: () => unknown, run: () => void) {
  const catalogQuery = trpc.platform.catalog as { useQuery: () => unknown };
  const originalUseQuery = catalogQuery.useQuery;
  catalogQuery.useQuery = useQuery;

  try {
    run();
  } finally {
    catalogQuery.useQuery = originalUseQuery;
  }
}

function withLabContactQueryOverride(useQuery: (input?: { siteKey?: string; contactScene?: string }) => unknown, run: () => void) {
  const contactConfigQuery = trpc.site.contactConfig as { useQuery: (input?: { siteKey?: string; contactScene?: string }) => unknown };
  const originalUseQuery = contactConfigQuery.useQuery;
  contactConfigQuery.useQuery = useQuery;

  try {
    run();
  } finally {
    contactConfigQuery.useQuery = originalUseQuery;
  }
}

function withCareCaseStudiesQueryOverride(useQuery: () => unknown, run: () => void) {
  const caseStudiesQuery = trpc.site.caseStudies as { useQuery: () => unknown };
  const originalUseQuery = caseStudiesQuery.useQuery;
  caseStudiesQuery.useQuery = useQuery;

  try {
    run();
  } finally {
    caseStudiesQuery.useQuery = originalUseQuery;
  }
}

function withEnterpriseApplicationsQueryOverride(useQuery: () => unknown, run: () => void) {
  const enterpriseApplicationsQuery = trpc.site.myEnterpriseApplications as { useQuery: () => unknown };
  const originalUseQuery = enterpriseApplicationsQuery.useQuery;
  enterpriseApplicationsQuery.useQuery = useQuery;

  try {
    run();
  } finally {
    enterpriseApplicationsQuery.useQuery = originalUseQuery;
  }
}

Object.defineProperty(globalThis, "history", {
  value: {
    pushState: () => undefined,
    replaceState: () => undefined,
  },
  configurable: true,
});

globalThis.addEventListener ??= () => undefined;
globalThis.removeEventListener ??= () => undefined;

describe("admin front-stage skeleton pages", () => {
  it("renders platform home with live site summaries, brand layering, and operating loop copy", () => {
    setPathname("/");
    const html = renderToStaticMarkup(<PlatformHome />);

    expect(html).toContain("统一平台总入口");
    expect(html).toContain("平台结构概览");
    expect(html).toContain("Live business snapshots");
    expect(html).toContain("当前首页摘要已切换为真实业务聚合数据");
    expect(html).toContain("4 个站点");
    expect(html).toContain("6 类能力");
    expect(html).toContain("B2B 商城系统");
    expect(html).toContain("5 个真实商品");
    expect(html).toContain("客户中心");
    expect(html).toContain("后台总览");
    expect(html).toContain("统一平台真正要解决的是经营协同");
  });

  it("renders shop page with checkout and payment planning copy", () => {
    setPathname("/shop");
    const html = renderToStaticMarkup(<ShopPage />);

    expect(html).toContain("购物车预览");
    expect(html).toContain("采购结算单");
    expect(html).toContain("支付方式选择");
    expect(html).toContain("微信支付 JSAPI");
    expect(html).toContain("5 个已接入");
    expect(html).toContain("3 类可浏览");
    expect(html).toContain("2 笔待推进");
    expect(html).toContain("目录来源：database");
    expect(html).toContain("硬表面清洁浓缩液");
    expect(html).toContain('href="/account"');
    expect(html).toContain('href="/admin/orders"');
  });

  it("renders lab site skeleton with archivist-style atmospheric messaging", () => {
    setPathname("/lab");
    const html = renderToStaticMarkup(<LabPage />);

    expect(html).toContain("iCloush LAB");
    expect(html).toContain("ATMOSPHERIC");
    expect(html).toContain("PURIFICATION");
    expect(html).toContain("LIVE DEPLOYMENT");
    expect(html).toContain("PUBLIC PRODUCTS");
    expect(html).toContain("PIPELINE ORDERS");
    expect(html).toContain("LEAD CAPTURE");
    expect(html).toContain("为合作、研发共创与技术交流提供可执行的咨询路径");
    expect(html).toContain("LAB 共创需求单");
    expect(html).toContain("[ INITIATE PROTOCOL ]");
    expect(html).toContain("[ REQUEST ACCESS ]");
    expect(html).toContain('href="/account"');
    expect(html).toContain('href="/shop"');
    expect(html).toContain("Live business-scene contact config is active");
  });

  it("renders lab request access CTA as an OAuth login url in browser-like environments", () => {
    setPathname("/lab");
    const originalWindow = globalThis.window;
    const env = { ...import.meta.env };

    Object.assign(import.meta.env, {
      VITE_OAUTH_PORTAL_URL: "https://portal.example.com",
      VITE_APP_ID: "app_123",
    });

    vi.stubGlobal("window", {
      location: {
        origin: "https://lab.example.com",
        pathname: "/lab",
        search: "",
        hash: "",
      },
    });

    try {
      const html = renderToStaticMarkup(<LabPage />);
      const hrefMatch = html.match(/href="([^"]*portal\.example\.com[^"]+)"/);
      expect(hrefMatch?.[1]).toBeTruthy();

      const loginUrl = new URL(hrefMatch![1].replace(/&amp;/g, "&"));
      const state = JSON.parse(Buffer.from(loginUrl.searchParams.get("state") ?? "", "base64").toString("utf8"));

      expect(loginUrl.origin).toBe("https://portal.example.com");
      expect(loginUrl.searchParams.get("redirectUri")).toBe("https://lab.example.com/api/oauth/callback");
      expect(state).toEqual({
        redirectUri: "https://lab.example.com/api/oauth/callback",
        returnPath: "/account",
      });
    } finally {
      vi.unstubAllGlobals();
      Object.assign(import.meta.env, env);
      if (originalWindow) {
        vi.stubGlobal("window", originalWindow);
      }
    }
  });

  it("explains fallback contact mode while preserving usable conversion targets", () => {
    setPathname("/lab");

    withLabContactQueryOverride(
      (input?: { siteKey?: string }) => ({
        data: input?.siteKey === "lab"
          ? {
              siteKey: "lab",
              contactScene: "business",
              source: "fallback",
              headline: "为合作、研发共创与技术交流提供可执行的咨询路径",
              description: "支持经销合作、联合研发、样品打样与场景测试沟通，线索将进入统一后台进行跟进与归档。",
              primaryCtaLabel: "联系客户经理",
              primaryCtaHref: "/account",
              secondaryCtaLabel: "查看产品采购入口",
              secondaryCtaHref: "/shop",
              contactEmail: "lab@icloush.com",
              contactPhone: "400-880-5720",
              contactWechat: "iCloushLAB",
              responseSla: "24H RESPONSE",
            }
          : null,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<LabPage />);

        expect(html).toContain("LOCAL FALLBACK");
        expect(html).toContain("Fallback contact config is active");
        expect(html).toContain("Initiate Protocol currently resolves to /account");
        expect(html).toContain('href="/account"');
        expect(html).toContain('href="/shop"');
      },
    );
  });

  it("renders tech site with managed solution modules and case studies", () => {
    setPathname("/tech");
    const html = renderToStaticMarkup(<TechPage />);

    expect(html).toContain("环洗朵科技");
    expect(html).toContain("真实商品");
    expect(html).toContain("方案订单");
    expect(html).toContain("项目线索");
    expect(html).toContain("官网首屏已切换为统一内容治理模式");
    expect(html).toContain("方案内容源");
    expect(html).toContain("后台已接管");
    expect(html).toContain("酒店布草与客房织物清洁方案");
    expect(html).toContain("适用对象：酒店后勤、外包洗涤团队");
    expect(html).toContain("物业项目标准化清洁剂替换方案");
    expect(html).toContain("合作对象：华东商办物业联合体");
    expect(html).toContain("合作品牌背书");
    expect(html).toContain("HUADONG PM");
  });

  it("renders care site skeleton with service package messaging", () => {
    setPathname("/care");
    const html = renderToStaticMarkup(<CarePage />);

    expect(html).toContain("iCloush Care");
    expect(html).toContain("服务介绍");
    expect(html).toContain("需求沟通与现状评估");
    expect(html).toContain("咨询线索");
    expect(html).toContain("在线咨询入口");
    expect(html).toContain("提交咨询需求");
    expect(html).toContain("酒店合作咨询");
    expect(html).toContain("提交后可继续在客户中心推进驻场排期、验收节点与长期维护安排。");
    expect(html).toContain("排期与交付确认");
  });

  it("renders care case studies success state from managed data", () => {
    setPathname("/care");
    const html = renderToStaticMarkup(<CarePage />);

    expect(html).toContain("合作酒店展示");
    expect(html).toContain("高端酒店布草奢护方案");
    expect(html).toContain("上海静安艺廊酒店");
    expect(html).toContain("上海");
    expect(html).toContain("高端酒店");
  });

  it("renders care case studies loading state", () => {
    setPathname("/care");

    withCareCaseStudiesQueryOverride(
      () => ({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<CarePage />);

        expect(html).toContain("案例同步中");
        expect(html).not.toContain("当前暂无可展示的合作案例");
        expect(html).not.toContain("合作酒店案例读取失败");
      },
    );
  });

  it("renders care case studies empty state", () => {
    setPathname("/care");

    withCareCaseStudiesQueryOverride(
      () => ({
        data: { items: [] },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<CarePage />);

        expect(html).toContain("当前暂无可展示的合作案例");
        expect(html).not.toContain("高端酒店布草奢护方案");
      },
    );
  });

  it("renders care case studies error state", () => {
    setPathname("/care");

    withCareCaseStudiesQueryOverride(
      () => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("合作酒店案例读取失败"),
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<CarePage />);

        expect(html).toContain("合作酒店案例读取失败，请稍后重试。");
        expect(html).toContain("重试读取");
      },
    );
  });

  it("renders account page with real order summary placeholders", () => {
    setPathname("/account");
    const html = renderToStaticMarkup(<AccountPage />);

    expect(html).toContain("ORD-1-ME-001");
    expect(html).toContain("最近一笔订单摘要");
    expect(html).toContain("订单与结算待办");
    expect(html).toContain("待结算 / 待审核");
    expect(html).toContain("下一步建议");
    expect(html).toContain("在后台查看审核闭环");
  });

  it("renders account enterprise onboarding status card with pending approved and rejected records", () => {
    setPathname("/account");
    const html = renderToStaticMarkup(<AccountPage />);

    expect(html).toContain("我的企业入驻状态");
    expect(html).toContain("1 条待审核");
    expect(html).toContain("上海研净实验室");
    expect(html).toContain("苏州净研科技");
    expect(html).toContain("杭州净护实验室");
    expect(html).toContain("待审核");
    expect(html).toContain("审核通过");
    expect(html).toContain("已驳回");
  });

  it("renders account enterprise onboarding loading empty and error states explicitly", () => {
    setPathname("/account");

    withEnterpriseApplicationsQueryOverride(
      () => ({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const loadingHtml = renderToStaticMarkup(<AccountPage />);

        expect(loadingHtml).toContain("正在同步你的企业入驻申请状态。");
        expect(loadingHtml).not.toContain("当前品牌下还没有企业入驻申请记录");
      },
    );

    withEnterpriseApplicationsQueryOverride(
      () => ({
        data: [],
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const emptyHtml = renderToStaticMarkup(<AccountPage />);

        expect(emptyHtml).toContain("当前品牌下还没有企业入驻申请记录。你可以直接在左侧提交企业资料，后台会自动进入审核闭环。");
      },
    );

    withEnterpriseApplicationsQueryOverride(
      () => ({
        data: undefined,
        isLoading: false,
        isError: false,
        error: new Error("企业入驻状态同步失败"),
        refetch: vi.fn(),
      }),
      () => {
        const errorHtml = renderToStaticMarkup(<AccountPage />);

        expect(errorHtml).toContain("企业入驻状态同步失败");
        expect(errorHtml).toContain("重试同步");
      },
    );
  });

  it("renders admin overview with live module snapshots and module navigation", () => {
    setPathname("/admin");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("后台总览");
    expect(html).toContain("站点矩阵");
    expect(html).toContain("真实运营快照");
    expect(html).toContain("产品管理");
    expect(html).toContain("客户管理");
    expect(html).toContain("SEO 配置");
  });

  it("renders admin product console with real product snapshot", () => {
    setPathname("/admin/products");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("Showroom 商品池与可筛选数据表");
    expect(html).toContain("全部系列");
    expect(html).toContain("ACTIVE");
    expect(html).toContain("Product Form");
    expect(html).toContain("Retail Bridge / 外部入口与二维码");
    expect(html).toContain("淘宝短链");
    expect(html).toContain("小程序路径");
    expect(html).toContain("微信小程序二维码 URL");
    expect(html).toContain("支付宝小程序二维码 URL");
    expect(html).toContain("上传主图");
    expect(html).toContain("选择图片");
    expect(html).toContain("Specs Builder");
    expect(html).toContain("添加参数");
    expect(html).toContain("大气重组基质");
    expect(html).toContain("VOID-B03");
    expect(html).toContain("实验室参数键值对");
  });

  it("renders admin customer console with real customers and leads", () => {
    setPathname("/admin/customers");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("客户经营总览");
    expect(html).toContain("真实客户档案与线索状态");
    expect(html).toContain("上海研净实验室");
    expect(html).toContain("最新线索");
    expect(html).toContain("品牌客户分布");
  });

  it("renders admin customer console with enterprise review actions and tier price badges", () => {
    setPathname("/admin/customers");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("待处理企业入驻申请");
    expect(html).toContain("1 条待审核");
    expect(html).toContain("广州净洗科技");
    expect(html).toContain("价格等级 待配置阶梯价");
    expect(html).toContain("审核通过");
    expect(html).toContain("驳回并回写说明");
  });

  it("renders admin content console with tech solution and case governance cards", () => {
    setPathname("/admin/content");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("内容编排矩阵");
    expect(html).toContain("商城与多品牌站点内容治理");
    expect(html).toContain("内容工作队列");
    expect(html).toContain("补齐 LAB 样品申请页");
    expect(html).toContain("LAB 联系配置");
    expect(html).toContain("环洗朵科技行业解决方案");
    expect(html).toContain("保存行业解决方案");
    expect(html).toContain("环洗朵科技客户案例");
    expect(html).toContain("保存客户案例");
    expect(html).toContain("环洗朵科技客户 Logo 墙");
    expect(html).toContain("保存客户 Logo 墙");
    expect(html).toContain("内容治理提醒");
  });

  it("renders admin seo console with live optimization opportunities", () => {
    setPathname("/admin/seo");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("SEO 治理清单");
    expect(html).toContain("站点元信息与商品元字段覆盖率");
    expect(html).toContain("补齐实验室净洗方案元描述");
    expect(html).toContain("优化机会");
    expect(html).toContain("SEO 治理提醒");
  });

  it("renders admin order console with review queue and fulfillment stages", () => {
    setPathname("/admin/orders");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("审核队列");
    expect(html).toContain("客户中心联动");
    expect(html).toContain("客户待办");
    expect(html).toContain("履约阶段");
    expect(html).toContain("近期订单");
    expect(html).toContain("ORD-1-QUEUE-001");
    expect(html).toContain("审核通过");
    expect(html).toContain("切换到客户中心");
  });
});


describe("homepage snapshot state helpers", () => {
  it("returns explicit fallback copy instead of fake metrics when homepage snapshot fails", () => {
    const snapshotState = resolveSnapshotState(undefined, false, true);
    const entries = buildHomepageEntrySnapshots(undefined, snapshotState);
    const shopEntry = entries.find((entry) => entry.title === "B2B 商城系统");

    expect(snapshotState).toBe("error");
    expect(shopEntry?.metrics).toEqual(["摘要读取失败", "支持重试"]);
    expect(shopEntry?.summary).toContain("不再伪装真实统计");
    expect(formatMetricValue(undefined, "个", "loading")).toBe("同步中");
    expect(formatMetricValue(undefined, "个", "error")).toBe("暂不可用");
    expect(formatMetricValue(6, "个", "ready")).toBe("6 个");
  });
});

describe("shop catalog state coverage", () => {
  it("filters products by the requested category and preserves catalog entry links", () => {
    setPathname("/shop");
    const defaultHtml = renderToStaticMarkup(<ShopPage />);
    const labHtml = renderToStaticMarkup(<ShopPage initialCategory="lab-consumables" />);

    expect(defaultHtml).toContain("目录来源：database");
    expect(defaultHtml).toContain("硬表面清洁浓缩液");
    expect(defaultHtml).not.toContain("实验室净洗试剂组套");
    expect(defaultHtml).toContain('href="/"');
    expect(defaultHtml).toContain('href="/account"');
    expect(defaultHtml).toContain('href="/admin/orders"');
    expect(labHtml).toContain("当前分类：实验室耗材");
    expect(labHtml).toContain("实验室净洗试剂组套");
    expect(labHtml).not.toContain("硬表面清洁浓缩液");
  });

  it("renders loading state without falling back to local sample categories", () => {
    setPathname("/shop");

    withCatalogQueryOverride(
      () => ({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<ShopPage />);

        expect(html).toContain("目录来源：loading");
        expect(html).toContain("商城目录正在同步");
        expect(html).toContain("分类目录仍在准备中");
        expect(html).not.toContain("专业清洁剂");
        expect(html).not.toContain("硬表面清洁浓缩液");
      },
    );
  });

  it("renders explicit empty-state copy for a database-backed empty catalog", () => {
    setPathname("/shop");

    withCatalogQueryOverride(
      () => ({
        data: {
          source: "database",
          generatedAt: "2026-04-11T02:00:00.000Z",
          categories: [],
          products: [],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<ShopPage />);

        expect(html).toContain("目录来源：database");
        expect(html).toContain("暂无可选分类");
        expect(html).toContain("当前还没有可浏览的真实目录分类");
        expect(html).toContain("当前还没有可浏览的真实目录数据");
        expect(html).not.toContain("专业清洁剂");
        expect(html).not.toContain("硬表面清洁浓缩液");
      },
    );
  });

  it("renders fallback catalog source explicitly when server supplies sample data", () => {
    setPathname("/shop");

    withCatalogQueryOverride(
      () => ({
        data: {
          source: "fallback",
          generatedAt: "2026-04-11T02:10:00.000Z",
          categories: [
            {
              id: 901,
              slug: "fallback-kit",
              name: "Fallback 样例分类",
              brandCode: "care",
              brandName: "iCloush Care",
              productCount: 1,
            },
          ],
          products: [
            {
              id: 902,
              slug: "fallback-service-kit",
              name: "Fallback 服务组合",
              brandCode: "care",
              brandName: "iCloush Care",
              categorySlug: "fallback-kit",
              categoryName: "Fallback 样例分类",
              subtitle: "用于数据库不可用时的浏览演示。",
              description: "仅在后端显式声明 fallback 来源时展示。",
              productType: "service",
              status: "active",
              specLabel: "Consulting Kit",
              minimumOrderLabel: "1 组起订",
              leadTimeLabel: "恢复后切回真实目录",
              priceLabel: "顾问报价",
              priceValue: null,
              badges: ["fallback", "演示结构"],
            },
          ],
        },
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<ShopPage />);

        expect(html).toContain("目录来源：fallback");
        expect(html).toContain("fallback 样例目录");
        expect(html).toContain("Fallback 样例分类");
        expect(html).toContain("Fallback 服务组合");
      },
    );
  });

  it("renders retry affordance when catalog query fails", () => {
    setPathname("/shop");

    withCatalogQueryOverride(
      () => ({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error("商城目录读取失败"),
        refetch: vi.fn(),
      }),
      () => {
        const html = renderToStaticMarkup(<ShopPage />);

        expect(html).toContain("目录来源：error");
        expect(html).toContain("商城目录读取失败");
        expect(html).toContain("重试目录同步");
        expect(html).toContain("暂不展示分类按钮");
        expect(html).not.toContain("专业清洁剂");
      },
    );
  });

  it("exposes catalog state helper outputs for database, fallback and empty snapshots", () => {
    const emptySnapshot = {
      source: "database",
      generatedAt: "2026-04-11T02:20:00.000Z",
      categories: [],
      products: [],
    } as const;
    const fallbackSnapshot = {
      source: "fallback",
      generatedAt: "2026-04-11T02:25:00.000Z",
      categories: [
        {
          id: 1,
          slug: "fallback-kit",
          name: "Fallback 样例分类",
          brandId: 3,
          brandCode: "care",
          brandName: "iCloush Care",
          productCount: 1,
        },
      ],
      products: [
        {
          id: 2,
          slug: "fallback-service-kit",
          name: "Fallback 服务组合",
          brandId: 3,
          brandCode: "care",
          brandName: "iCloush Care",
          categoryId: 1,
          categorySlug: "fallback-kit",
          categoryName: "Fallback 样例分类",
          subtitle: "用于数据库不可用时的浏览演示。",
          description: "仅在后端显式声明 fallback 来源时展示。",
          productType: "service",
          status: "active",
          unit: "组",
          updatedAt: "2026-04-11T02:25:00.000Z",
          specLabel: "Consulting Kit",
          minimumOrderLabel: "1 组起订",
          leadTimeLabel: "恢复后切回真实目录",
          priceLabel: "顾问报价",
          priceValue: null,
          badges: ["fallback", "演示结构"],
        },
      ],
    } as const;

    expect(resolveCatalogState(undefined, true, false)).toBe("loading");
    expect(resolveCatalogState(undefined, false, true)).toBe("error");
    expect(resolveCatalogState(emptySnapshot, false, false)).toBe("empty");
    expect(resolveCatalogState(fallbackSnapshot, false, false)).toBe("ready");
    expect(getCatalogSourceCode(fallbackSnapshot, "ready")).toBe("fallback");
    expect(getCatalogSourceCode(undefined, "loading")).toBe("loading");
    expect(mapCatalogCategories(emptySnapshot)).toEqual([]);
    expect(mapCatalogProducts(emptySnapshot)).toEqual([]);
    expect(mapCatalogCategories(fallbackSnapshot)).toEqual([
      {
        id: "fallback-kit",
        label: "Fallback 样例分类",
        note: "iCloush Care · 1 个可浏览商品",
      },
    ]);
    expect(mapCatalogProducts(fallbackSnapshot)[0]).toMatchObject({
      id: "fallback-service-kit",
      categoryId: "fallback-kit",
      brand: "iCloush Care",
      name: "Fallback 服务组合",
    });
  });
});

describe("error recovery affordances", () => {
  it("renders homepage empty state with preserved site entry links", () => {
    setPathname("/");
    const platformSnapshotQuery = trpc.platform.snapshot as { useQuery: () => unknown };
    const originalUseQuery = platformSnapshotQuery.useQuery;
    platformSnapshotQuery.useQuery = () => ({
      data: undefined,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    try {
      const html = renderToStaticMarkup(<PlatformHome />);

      expect(html).toContain("等待首批数据");
      expect(html).toContain("入口已就绪");
      expect(html).toContain('href="/shop"');
      expect(html).toContain('href="/lab"');
      expect(html).toContain('href="/tech"');
      expect(html).toContain('href="/care"');
      expect(html).toContain('href="/account"');
      expect(html).toContain('href="/admin"');
    } finally {
      platformSnapshotQuery.useQuery = originalUseQuery;
    }
  });

  it("renders homepage retry action when platform snapshot fails", () => {
    setPathname("/");
    const platformSnapshotQuery = trpc.platform.snapshot as { useQuery: () => unknown };
    const originalUseQuery = platformSnapshotQuery.useQuery;
    platformSnapshotQuery.useQuery = () => ({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("平台聚合摘要读取失败"),
      refetch: vi.fn(),
    });

    try {
      const html = renderToStaticMarkup(<PlatformHome />);

      expect(html).toContain("摘要读取失败");
      expect(html).toContain("支持重试");
      expect(html).toContain("重试同步");
      expect(html).toContain('href="/shop"');
      expect(html).toContain('href="/lab"');
      expect(html).toContain('href="/tech"');
      expect(html).toContain('href="/care"');
      expect(html).toContain('href="/account"');
      expect(html).toContain('href="/admin"');
    } finally {
      platformSnapshotQuery.useQuery = originalUseQuery;
    }
  });

  it("renders retry action when account order sync fails", () => {
    setPathname("/account");
    const myListQuery = trpc.orders.myList as { useQuery: () => unknown };
    const originalUseQuery = myListQuery.useQuery;
    myListQuery.useQuery = () => ({
      data: undefined,
      isLoading: false,
      error: new Error("订单同步失败，请稍后重试。"),
      refetch: vi.fn(),
    });

    try {
      const html = renderToStaticMarkup(<AccountPage />);

      expect(html).toContain("订单同步失败，请稍后重试。");
      expect(html).toContain("重试同步");
    } finally {
      myListQuery.useQuery = originalUseQuery;
    }
  });

  it("renders retry action when admin operations snapshot fails", () => {
    setPathname("/admin/customers");
    const operationsQuery = trpc.admin.operations as { useQuery: () => unknown };
    const originalUseQuery = operationsQuery.useQuery;
    operationsQuery.useQuery = () => ({
      data: undefined,
      isLoading: false,
      isError: true,
      error: new Error("客户运营快照暂时不可用"),
      refetch: vi.fn(),
    });

    try {
      const html = renderToStaticMarkup(<AdminContent />);

      expect(html).toContain("客户运营快照暂时不可用，稍后重试即可恢复客户与线索视图。");
      expect(html).toContain("重试同步");
    } finally {
      operationsQuery.useQuery = originalUseQuery;
    }
  });
});

describe("responsive affordances", () => {
  it("keeps homepage mobile quick links scrollable and preserves desktop summary grids", () => {
    setPathname("/");
    const html = renderToStaticMarkup(<PlatformHome />);

    expect(html).toContain("overflow-x-auto");
    expect(html).toContain("sm:grid-cols-2");
    expect(html).toContain("sm:grid-cols-3");
  });

  it("keeps public site routes with large touch-friendly CTAs and responsive metric grids", () => {
    const shopHtml = renderToStaticMarkup(<ShopPage />);
    const labHtml = renderToStaticMarkup(<LabPage />);
    const techHtml = renderToStaticMarkup(<TechPage />);
    const careHtml = renderToStaticMarkup(<CarePage />);

    for (const html of [shopHtml, labHtml, techHtml, careHtml]) {
      expect(html).toContain("inline-flex h-12 items-center justify-center rounded-full");
      expect(html).toMatch(/sm:grid-cols-[23]/);
    }

    expect(labHtml).not.toContain("后续接入");
    expect(labHtml).not.toContain("coming soon");
    expect(labHtml).not.toContain("敬请期待");
  });

  it("keeps account overview cards responsive from mobile stacking to xl dashboard density", () => {
    setPathname("/account");
    const html = renderToStaticMarkup(<AccountPage />);

    expect(html).toContain("mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4");
    expect(html).toContain("mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4");
    expect(html).toContain("mt-6 flex flex-col gap-3 sm:flex-row");
  });
});

describe("lab contact config update helpers", () => {
  const draft = {
    headline: "为合作、研发共创与技术交流提供可执行的咨询路径",
    description: "支持经销合作、联合研发、样品打样与场景测试沟通，线索将进入统一后台进行跟进与归档。",
    primaryCtaLabel: "提交合作需求",
    primaryCtaHref: "/account",
    secondaryCtaLabel: "LAB 共创需求单",
    secondaryCtaHref: "/shop",
    contactEmail: "lab@icloush.com",
    contactPhone: "400-820-2026",
    contactWechat: "iCloushLAB",
    contactAddress: "上海市闵行区研发协同中心 3F",
    serviceHours: "周一至周五 09:00-18:00",
    responseSla: "1 个工作日内答复",
  };

  it("builds a lab-scoped payload for contact config updates", () => {
    expect(buildLabContactConfigPayload(draft)).toEqual({
      siteKey: "lab",
      contactScene: "business",
      ...draft,
    });
  });

  it("submits the normalized payload through the provided mutation callback", () => {
    const mutate = vi.fn();

    submitLabContactConfigUpdate(mutate, draft);

    expect(mutate).toHaveBeenCalledWith(buildLabContactConfigPayload(draft));
  });

  it("returns explicit success and failure feedback copy for lab contact updates", () => {
    expect(getLabContactUpdateSuccessMessage()).toContain("前台联系入口会同步展示最新内容");
    expect(getLabContactUpdateErrorMessage({ message: "FORBIDDEN" })).toBe("FORBIDDEN");
    expect(getLabContactUpdateErrorMessage(undefined)).toBe("联系配置更新失败，请稍后重试。");
  });

  it("refetches dependent queries after a successful save", async () => {
    const refetchContactConfig = vi.fn(async () => "contact");
    const refetchOperations = vi.fn(async () => "operations");

    await syncLabContactConfigAfterSave([refetchContactConfig, refetchOperations]);

    expect(refetchContactConfig).toHaveBeenCalledTimes(1);
    expect(refetchOperations).toHaveBeenCalledTimes(1);
  });

  it("cascades enterprise review refreshers and exposes updated account status after review success", async () => {
    let applicationRecords = [
      {
        brandId: 1,
        brandName: "iCloush LAB.",
        enterpriseName: "上海研净实验室",
        contactName: "陈工",
        memberType: "enterprise",
        status: "pending",
        createdAt: "2026-04-10T09:00:00.000Z",
        updatedAt: "2026-04-10T09:00:00.000Z",
      },
    ];
    const invalidateAdminOperations = vi.fn(async () => "operations-invalidated");
    const invalidateEnterpriseApplications = vi.fn(async () => {
      applicationRecords = [
        {
          ...applicationRecords[0],
          status: "approved",
          updatedAt: "2026-04-11T09:00:00.000Z",
        },
      ];
      return "enterprise-invalidated";
    });

    withEnterpriseApplicationsQueryOverride(
      () => ({
        data: applicationRecords,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const pendingHtml = renderToStaticMarkup(<AccountPage />);

        expect(pendingHtml).toContain("1 条待审核");
        expect(pendingHtml).toContain("最近申请状态");
        expect(pendingHtml).toContain("提交时间 04/10");
      },
    );

    await syncEnterpriseApplicationReviewAfterSave([
      invalidateAdminOperations,
      invalidateEnterpriseApplications,
    ]);

    expect(invalidateAdminOperations).toHaveBeenCalledTimes(1);
    expect(invalidateEnterpriseApplications).toHaveBeenCalledTimes(1);

    withEnterpriseApplicationsQueryOverride(
      () => ({
        data: applicationRecords,
        isLoading: false,
        isError: false,
        error: null,
        refetch: vi.fn(),
      }),
      () => {
        const approvedHtml = renderToStaticMarkup(<AccountPage />);

        expect(approvedHtml).toContain("审核通过");
        expect(approvedHtml).toContain("无待审核申请");
        expect(approvedHtml).toContain("最近更新 04/11");
      },
    );
  });
});

describe("seo configuration", () => {
  it("resolves public route metadata with indexable robots policy", () => {
    const seo = resolveSeoConfig("/shop");

    expect(seo.title).toContain("B2B 商城系统");
    expect(seo.description).toContain("企业采购");
    expect(seo.robots).toBe("index, follow");
  });

  it("falls back admin sub-routes to noindex console metadata", () => {
    const seo = resolveSeoConfig("/admin/unknown-module");

    expect(seo.title).toContain("后台总览");
    expect(seo.robots).toBe("noindex, nofollow");
  });

  it("falls back unknown public routes to 404 metadata", () => {
    const seo = resolveSeoConfig("/missing-page");

    expect(seo.title).toContain("页面未找到");
    expect(seo.robots).toBe("noindex, nofollow");
  });
});

describe("seo public assets", () => {
  it("writes robots.txt with admin exclusion rules and sitemap reference", () => {
    const robots = fs.readFileSync(path.resolve(import.meta.dirname, "../public/robots.txt"), "utf8");

    expect(robots).toContain("Allow: /");
    expect(robots).toContain("Disallow: /admin");
    expect(robots).toContain("Disallow: /account");
    expect(robots).toContain("Sitemap: /sitemap.xml");
  });

  it("writes sitemap.xml for the five public entry routes", () => {
    const sitemap = fs.readFileSync(path.resolve(import.meta.dirname, "../public/sitemap.xml"), "utf8");

    expect(sitemap).toContain("<loc>/</loc>");
    expect(sitemap).toContain("<loc>/shop</loc>");
    expect(sitemap).toContain("<loc>/lab</loc>");
    expect(sitemap).toContain("<loc>/tech</loc>");
    expect(sitemap).toContain("<loc>/care</loc>");
    expect(sitemap).not.toContain("/admin");
    expect(sitemap).not.toContain("/account");
  });
});
