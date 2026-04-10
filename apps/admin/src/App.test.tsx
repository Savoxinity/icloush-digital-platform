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
  resolveSeoConfig,
} from "./App";

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
  it("renders platform home with commerce and brand navigation copy", () => {
    setPathname("/");
    const html = renderToStaticMarkup(<PlatformHome />);

    expect(html).toContain("统一平台总入口");
    expect(html).toContain("平台结构概览");
  });

  it("renders shop page with checkout and payment planning copy", () => {
    setPathname("/shop");
    const html = renderToStaticMarkup(<ShopPage />);

    expect(html).toContain("购物车预览");
    expect(html).toContain("采购结算单");
    expect(html).toContain("支付方式选择");
    expect(html).toContain("微信支付 JSAPI");
  });

  it("renders lab site skeleton with service-oriented messaging", () => {
    setPathname("/lab");
    const html = renderToStaticMarkup(<LabPage />);

    expect(html).toContain("iCloush LAB");
  });

  it("renders tech site skeleton with industrial solution messaging", () => {
    setPathname("/tech");
    const html = renderToStaticMarkup(<TechPage />);

    expect(html).toContain("环洗朵科技");
  });

  it("renders care site skeleton with service package messaging", () => {
    setPathname("/care");
    const html = renderToStaticMarkup(<CarePage />);

    expect(html).toContain("iCloush Care");
    expect(html).toContain("服务介绍");
  });

  it("renders account page with real order summary placeholders", () => {
    setPathname("/account");
    const html = renderToStaticMarkup(<AccountPage />);

    expect(html).toContain("ORD-1-ME-001");
    expect(html).toContain("最近一笔订单摘要");
    expect(html).toContain("订单与结算待办");
  });

  it("renders admin overview with site matrix and module navigation", () => {
    setPathname("/admin");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("后台总览");
    expect(html).toContain("站点矩阵");
    expect(html).toContain("商城与官网统一运营入口");
    expect(html).toContain("产品管理");
    expect(html).toContain("SEO 配置");
  });

  it("renders admin product console with workstreams and placeholder actions", () => {
    setPathname("/admin/products");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("商品治理工位");
    expect(html).toContain("待接真实商品接口的后台操作位");
    expect(html).toContain("新建商品模板");
    expect(html).toContain("iCloush LAB.");
  });

  it("renders admin customer console with lifecycle planning copy", () => {
    setPathname("/admin/customers");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("客户生命周期骨架");
    expect(html).toContain("客户中心映射");
    expect(html).toContain("采购主体");
    expect(html).toContain("定义跟进字段");
  });

  it("renders admin content console with site matrix and actions", () => {
    setPathname("/admin/content");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("内容编排矩阵");
    expect(html).toContain("内容工作流");
    expect(html).toContain("新建官网专题页");
    expect(html).toContain("B2B 商城系统");
  });

  it("renders admin seo console with governance checklist", () => {
    setPathname("/admin/seo");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("SEO 治理清单");
    expect(html).toContain("站点优先级");
    expect(html).toContain("生成标题模板");
    expect(html).toContain("结构化内容");
  });

  it("renders admin order console with review queue and fulfillment stages", () => {
    setPathname("/admin/orders");
    const html = renderToStaticMarkup(<AdminContent />);

    expect(html).toContain("审核队列");
    expect(html).toContain("履约阶段");
    expect(html).toContain("近期订单");
    expect(html).toContain("ORD-1-QUEUE-001");
    expect(html).toContain("审核通过");
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
