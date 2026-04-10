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
  const createQuery = (data: unknown) => ({
    useQuery: () => ({
      data,
      isLoading: false,
      error: null,
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
      },
      admin: {
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
                email: "lab@example.com",
                mobile: "13800000000",
                accountType: "enterprise",
                globalRole: "user",
                lastSignedIn: "2026-04-09T10:00:00.000Z",
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
  formatMetricValue,
  resolveSeoConfig,
  resolveSnapshotState,
} from "./App";
import { trpc } from "./lib/trpc";

function setPathname(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: { pathname, search: "", hash: "" },
    configurable: true,
  });
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
  });

  it("renders lab site skeleton with service-oriented messaging", () => {
    setPathname("/lab");
    const html = renderToStaticMarkup(<LabPage />);

    expect(html).toContain("iCloush LAB");
    expect(html).toContain("3 个");
    expect(html).toContain("2 笔");
    expect(html).toContain("1 条");
  });

  it("renders tech site skeleton with industrial solution messaging", () => {
    setPathname("/tech");
    const html = renderToStaticMarkup(<TechPage />);

    expect(html).toContain("环洗朵科技");
    expect(html).toContain("真实商品");
    expect(html).toContain("方案订单");
    expect(html).toContain("项目线索");
  });

  it("renders care site skeleton with service package messaging", () => {
    setPathname("/care");
    const html = renderToStaticMarkup(<CarePage />);

    expect(html).toContain("iCloush Care");
    expect(html).toContain("服务介绍");
    expect(html).toContain("在途服务订单");
    expect(html).toContain("咨询线索");
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

    expect(html).toContain("商品治理工位");
    expect(html).toContain("真实商品、分类与内容就绪度");
    expect(html).toContain("实验室净洗方案");
    expect(html).toContain("品牌商品分布");
    expect(html).toContain("治理提醒");
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

  it("renders admin content console with site governance queue", () => {
    setPathname("/admin/content");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("内容编排矩阵");
    expect(html).toContain("商城与多品牌站点内容治理");
    expect(html).toContain("内容工作队列");
    expect(html).toContain("补齐 LAB 样品申请页");
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
  });

  it("keeps account overview cards responsive from mobile stacking to xl dashboard density", () => {
    setPathname("/account");
    const html = renderToStaticMarkup(<AccountPage />);

    expect(html).toContain("mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4");
    expect(html).toContain("mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4");
    expect(html).toContain("mt-6 flex flex-col gap-3 sm:flex-row");
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
