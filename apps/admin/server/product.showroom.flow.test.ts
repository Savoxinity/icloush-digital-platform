import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sharedProducts: Array<{
  id: number;
  brandId: number;
  brandCode: string;
  brandName: string;
  code: string;
  name: string;
  slug: string;
  series: "AP" | "FC" | null;
  price: number | null;
  status: string;
  imageUrl: string | null;
  subtitle: string | null;
  description: string | null;
  specs: Array<{ key: string; value: string }>;
  updatedAt: string | null;
}> = [];

let nextId = 3000;

const BRAND_LOOKUP = {
  1: { code: "huanxiduo", name: "环洗朵科技" },
  2: { code: "icloush-lab", name: "iCloush LAB." },
  3: { code: "icloush-care", name: "iCloush Care" },
} as const;

function applyFilters(
  filters: { brandId?: number; series?: "AP" | "FC" | "all"; status?: "draft" | "active" | "archived" | "all" } = {},
) {
  return sharedProducts.filter((record) => {
    const brandMatched = filters.brandId ? record.brandId === filters.brandId : true;
    const seriesMatched = !filters.series || filters.series === "all" ? true : record.series === filters.series;
    const statusMatched = !filters.status || filters.status === "all" ? true : record.status === filters.status;
    return brandMatched && seriesMatched && statusMatched;
  });
}

function buildSnapshot(
  filters: { brandId?: number; series?: "AP" | "FC" | "all"; status?: "draft" | "active" | "archived" | "all" } = {},
) {
  const products = applyFilters(filters);
  return {
    generatedAt: new Date("2026-04-18T19:20:00.000Z").toISOString(),
    source: "database" as const,
    brandId: filters.brandId ?? products[0]?.brandId ?? null,
    brandCode:
      products[0]?.brandCode
      ?? (typeof filters.brandId === "number" ? BRAND_LOOKUP[filters.brandId as keyof typeof BRAND_LOOKUP]?.code ?? "icloush-lab" : "icloush-lab"),
    brandName:
      products[0]?.brandName
      ?? (typeof filters.brandId === "number" ? BRAND_LOOKUP[filters.brandId as keyof typeof BRAND_LOOKUP]?.name ?? "iCloush LAB." : "iCloush LAB."),
    filters: {
      series: filters.series ?? "all",
      status: filters.status ?? "all",
    },
    products,
  };
}

async function mockedUpsertProduct(input: {
  id?: number;
  brandId: number;
  code: string;
  name: string;
  slug?: string | null;
  series?: "AP" | "FC" | null;
  price?: number | null;
  status?: "draft" | "active" | "archived" | null;
  imageUrl?: string | null;
  subtitle?: string | null;
  description?: string | null;
  specs?: Array<{ key: string; value: string }> | null;
}) {
  const slug = (input.slug?.trim() || input.code.trim().toLowerCase()).replace(/[^a-z0-9-]+/g, "-");
  const shortCode = `iclou-${slug.replace(/[^a-z0-9]+/g, "").slice(0, 10)}`;
  const persistedSpecs = [
    ...(input.specs ?? []).filter((item) => !["__retail_landing_path", "__retail_short_code", "__retail_short_url"].includes(item.key)),
    { key: "__retail_landing_path", value: `/product/${slug}` },
    { key: "__retail_short_code", value: shortCode },
    { key: "__retail_short_url", value: `/s/${shortCode}` },
  ];
  const brandMeta = BRAND_LOOKUP[input.brandId as keyof typeof BRAND_LOOKUP] ?? BRAND_LOOKUP[2];
  const normalized = {
    id: input.id ?? nextId++,
    brandId: input.brandId,
    brandCode: brandMeta.code,
    brandName: brandMeta.name,
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    slug,
    series: input.series ?? null,
    price: typeof input.price === "number" ? input.price : null,
    status: input.status ?? "draft",
    imageUrl: input.imageUrl ?? null,
    subtitle: input.subtitle ?? null,
    description: input.description ?? null,
    specs: persistedSpecs,
    updatedAt: new Date("2026-04-18T19:20:00.000Z").toISOString(),
  };

  const existingIndex = sharedProducts.findIndex((record) => record.id === normalized.id || record.code === normalized.code);
  if (existingIndex >= 0) {
    sharedProducts[existingIndex] = normalized;
  } else {
    sharedProducts.push(normalized);
  }

  return {
    tenant: { brandId: input.brandId },
    mode: existingIndex >= 0 ? ("updated" as const) : ("created" as const),
    product: normalized,
  };
}

vi.mock("./db", async () => {
  const actual = await vi.importActual<typeof import("./db")>("./db");
  return {
    ...actual,
    listManagedProducts: vi.fn(async (filters?: { brandId?: number; series?: "AP" | "FC" | "all"; status?: "draft" | "active" | "archived" | "all" }) =>
      buildSnapshot(filters),
    ),
    getManagedProductDetail: vi.fn(async (filters: { id?: number; code?: string; slug?: string }) => {
      return (
        sharedProducts.find((record) =>
          typeof filters.id === "number"
            ? record.id === filters.id
            : filters.code
              ? record.code === filters.code.trim().toUpperCase()
              : filters.slug
                ? record.slug === filters.slug.trim().toLowerCase()
                : false,
        ) ?? null
      );
    }),
    upsertManagedProduct: vi.fn(mockedUpsertProduct),
  };
});

vi.mock("../../web-b2b/server/db", async () => {
  const actual = await vi.importActual<typeof import("../../web-b2b/server/db")>("../../web-b2b/server/db");
  return {
    ...actual,
    listManagedProducts: vi.fn(async (filters?: { brandId?: number; series?: "AP" | "FC" | "all"; status?: "draft" | "active" | "archived" | "all" }) =>
      buildSnapshot(filters),
    ),
    getManagedProductDetail: vi.fn(async (filters: { id?: number; code?: string; slug?: string }) => {
      return (
        sharedProducts.find((record) =>
          typeof filters.id === "number"
            ? record.id === filters.id
            : filters.code
              ? record.code === filters.code.trim().toUpperCase()
              : filters.slug
                ? record.slug === filters.slug.trim().toLowerCase()
                : false,
        ) ?? null
      );
    }),
    getManagedProductByShortCode: vi.fn(async (shortCode: string) => {
      const normalizedShortCode = shortCode.trim().toLowerCase();
      return (
        sharedProducts.find((record) =>
          record.specs.some(
            (spec) => spec.key === "__retail_short_code" && spec.value.trim().toLowerCase() === normalizedShortCode,
          ),
        ) ?? null
      );
    }),
  };
});

import { appRouter as adminAppRouter } from "./routers";
import { getManagedProductByShortCode } from "../../web-b2b/server/db";
import { appRouter as webB2BAppRouter } from "../../web-b2b/server/routers";
import { resolveShortlinkRedirectTarget } from "../../web-b2b/server/shortlink";
import { ProductDetailPage, ShowroomPage, mapManagedProductToShowroom } from "../../web-b2b/src/App";

function setLocation(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: new URL(`https://example.com${pathname}`),
    configurable: true,
  });
}

describe("Sprint 3 product create-then-render flow", () => {
  beforeEach(() => {
    sharedProducts.length = 0;
    nextId = 3000;
  });

  it("allows an admin-created product to be fetched by web-b2b showroom and rendered", async () => {
    const adminCaller = adminAppRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: { id: 1, role: "admin", globalRole: "admin" } as never,
    });
    const webCaller = webB2BAppRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });

    const receipt = await adminCaller.admin.upsertProduct({
      brandId: 2,
      code: "TEST-X01",
      name: "联通验证样品",
      slug: "test-x01",
      series: "AP",
      price: 1680,
      status: "active",
      imageUrl: "/manus-storage/icloush/test-x01.png",
      subtitle: "Atmospheric Purification / integration proof object",
      description: "该条目用于证明 admin 创建后的商品可被 showroom 真实拉取。",
      unit: "件",
      specs: [
        { key: "除味率", value: "99.8%" },
        { key: "验证批次", value: "SPRINT4" },
        { key: "__retail_taobao_url", value: "https://m.tb.cn/sandbox-flow" },
        { key: "__retail_mini_program_path", value: "pages/retail/detail?sku=TEST-X01" },
        { key: "__retail_wechat_qr_url", value: "https://cdn.example.com/test-x01-wechat-qr.png" },
      ],
    });

    expect(receipt.mode).toBe("created");
    expect(receipt.product.code).toBe("TEST-X01");

    const showroomSnapshot = await webCaller.retail.galleryObjects({
      brandId: 2,
      series: "all",
      status: "all",
    });
    expect(showroomSnapshot.source).toBe("database");
    expect(showroomSnapshot.products.some((product) => product.code === "TEST-X01")).toBe(true);

    const detail = await webCaller.retail.objectDetail({ slug: "test-x01" });
    expect(detail.name).toBe("联通验证样品");
    expect(detail.specs[0]?.value).toBe("99.8%");

    const showroomProduct = mapManagedProductToShowroom(detail as never, 0, "database");
    expect(showroomProduct.externalAccess?.taobaoUrl).toBe("https://m.tb.cn/sandbox-flow");
    expect(showroomProduct.externalAccess?.miniProgramPath).toBe("pages/retail/detail?sku=TEST-X01");
    expect(showroomProduct.externalAccess?.wechatQrUrl).toBe("https://cdn.example.com/test-x01-wechat-qr.png");
    expect(detail.specs.some((spec) => spec.key === "__retail_landing_path" && spec.value === "/product/test-x01")).toBe(true);
    expect(detail.specs.some((spec) => spec.key === "__retail_short_code" && spec.value === "iclou-testx01")).toBe(true);
    expect(detail.specs.some((spec) => spec.key === "__retail_short_url" && spec.value === "/s/iclou-testx01")).toBe(true);

    setLocation("/gallery");
    const html = renderToStaticMarkup(
      React.createElement(ShowroomPage, {
        products: [showroomProduct],
        sourceLabel: "DATABASE",
      }),
    );
    const pdpHtml = renderToStaticMarkup(React.createElement(ProductDetailPage, { id: "test-x01", product: showroomProduct }));
    expect(html).toContain("联通验证样品");
    expect(html).toContain("TEST-X01");
    expect(html).toContain("DATABASE");
    expect(html).toContain("/object/test-x01");
    expect(pdpHtml).toContain("https://m.tb.cn/sandbox-flow");
    expect(pdpHtml).toContain("pages/retail/detail?sku=TEST-X01");
    expect(pdpHtml).toContain("https://cdn.example.com/test-x01-wechat-qr.png");
    expect(pdpHtml).toContain("EXTERNAL ACCESS / 外部入口");
  });

  it("renders a Huanxiduo sample product from admin publish flow into the brand shelf and PDP", async () => {
    const adminCaller = adminAppRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: { id: 1, role: "admin", globalRole: "admin" } as never,
    });
    const webCaller = webB2BAppRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: null,
    });

    const receipt = await adminCaller.admin.upsertProduct({
      brandId: 1,
      code: "HXD-LINEN-01",
      name: "环洗朵高浓缩洁净剂",
      slug: "huanxiduo-linen-01",
      series: "AP",
      price: 680,
      status: "active",
      imageUrl: "/manus-storage/icloush/huanxiduo-linen-01.png",
      subtitle: "Huanxiduo sample shelf item / MVP proof",
      description: "该条目用于证明环洗朵商品可从 Admin 上架后进入前端货架与 PDP。",
      unit: "桶",
      specs: [
        { key: "适用场景", value: "酒店布草洗护" },
        { key: "起订量", value: "6 桶" },
        { key: "__retail_wechat_qr_url", value: "https://cdn.example.com/hxd-linen-01-wechat-qr.png" },
      ],
    });

    expect(receipt.tenant.brandId).toBe(1);
    expect(receipt.product.brandName).toBe("环洗朵科技");

    const showroomSnapshot = await webCaller.retail.galleryObjects({
      brandId: 1,
      series: "all",
      status: "all",
    });
    expect(showroomSnapshot.brandId).toBe(1);
    expect(showroomSnapshot.brandCode).toBe("huanxiduo");
    expect(showroomSnapshot.products.some((product) => product.code === "HXD-LINEN-01")).toBe(true);

    const detail = await webCaller.retail.objectDetail({ slug: "huanxiduo-linen-01", brandId: 1 });
    expect(detail.brandId).toBe(1);
    expect(detail.brandName).toBe("环洗朵科技");

    const showroomProduct = mapManagedProductToShowroom(detail as never, 0, "database");
    setLocation("/shop");
    const shelfHtml = renderToStaticMarkup(
      React.createElement(ShowroomPage, {
        products: [showroomProduct],
        sourceLabel: "DATABASE",
      }),
    );
    const pdpHtml = renderToStaticMarkup(React.createElement(ProductDetailPage, { id: "huanxiduo-linen-01", product: showroomProduct }));

    expect(shelfHtml).toContain("环洗朵高浓缩洁净剂");
    expect(shelfHtml).toContain("/object/huanxiduo-linen-01");
    expect(pdpHtml).toContain("环洗朵科技");
    expect(pdpHtml).toContain("酒店布草洗护");
    expect(pdpHtml).toContain("https://cdn.example.com/hxd-linen-01-wechat-qr.png");
  });

  it("resolves persisted short code to PDP route and falls back to gallery when missing", async () => {
    const adminCaller = adminAppRouter.createCaller({
      req: {} as never,
      res: {} as never,
      user: { id: 1, role: "admin", globalRole: "admin" } as never,
    });

    await adminCaller.admin.upsertProduct({
      brandId: 2,
      code: "TEST-LINK-01",
      name: "短链验证样品",
      slug: "test-link-01",
      series: "FC",
      price: 2680,
      status: "active",
      imageUrl: "/manus-storage/icloush/test-link-01.png",
      unit: "件",
      specs: [{ key: "验证批次", value: "SHORTLINK" }],
    });

    const resolvedProduct = await getManagedProductByShortCode("iclou-testlink01");
    expect(resolvedProduct?.slug).toBe("test-link-01");

    const resolvedTarget = await resolveShortlinkRedirectTarget({
      shortCode: "iclou-testlink01",
      getProductByShortCode: getManagedProductByShortCode,
    });
    const fallbackTarget = await resolveShortlinkRedirectTarget({
      shortCode: "missing-code",
      getProductByShortCode: getManagedProductByShortCode,
    });

    expect(resolvedTarget).toBe("/object/test-link-01");
    expect(fallbackTarget).toBe("/gallery");
  });
});
