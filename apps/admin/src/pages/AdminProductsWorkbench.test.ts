import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import AdminProductsWorkbench, {
  getDetailImageValidationError,
  isAllowedDetailImageUrl,
  normalizeDetailImageValue,
} from "./AdminProductsWorkbench";

const invalidateMock = vi.fn(async () => undefined);
const managedProductsRefetchMock = vi.fn(async () => undefined);
const uploadMutateAsyncMock = vi.fn(async () => ({ url: "https://cdn.example.com/product.png" }));
const upsertMutateMock = vi.fn();
const managedProductsDataMock = vi.hoisted(() => ({ products: [] as Array<Record<string, unknown>> }));
const managedProductsQueryStateMock = vi.hoisted(() => ({ isLoading: false, isError: false }));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        managedProducts: { invalidate: invalidateMock },
        operations: { invalidate: invalidateMock },
      },
      platform: {
        showroomProducts: { invalidate: invalidateMock },
      },
    }),
    admin: {
      managedProducts: {
        useQuery: () => ({
          data: managedProductsDataMock,
          isLoading: managedProductsQueryStateMock.isLoading,
          isError: managedProductsQueryStateMock.isError,
          refetch: managedProductsRefetchMock,
        }),
      },
      uploadProductImage: {
        useMutation: () => ({
          isPending: false,
          mutateAsync: uploadMutateAsyncMock,
        }),
      },
      upsertProduct: {
        useMutation: () => ({
          isPending: false,
          mutate: upsertMutateMock,
        }),
      },
    },
  },
}));

describe("AdminProductsWorkbench detail image helpers", () => {
  beforeEach(() => {
    invalidateMock.mockClear();
    managedProductsRefetchMock.mockClear();
    uploadMutateAsyncMock.mockClear();
    upsertMutateMock.mockClear();
    managedProductsDataMock.products = [];
    managedProductsQueryStateMock.isLoading = false;
    managedProductsQueryStateMock.isError = false;
  });

  it("normalizes multiline detail image input while preserving order", () => {
    expect(
      normalizeDetailImageValue(" https://cdn.example.com/a.png\n\n/manus-storage/demo/b.png \nhttps://cdn.example.com/c.png "),
    ).toEqual([
      "https://cdn.example.com/a.png",
      "/manus-storage/demo/b.png",
      "https://cdn.example.com/c.png",
    ]);
  });

  it("accepts only http(s) and /manus-storage detail image urls", () => {
    expect(isAllowedDetailImageUrl("https://cdn.example.com/a.png")).toBe(true);
    expect(isAllowedDetailImageUrl("http://cdn.example.com/a.png")).toBe(true);
    expect(isAllowedDetailImageUrl("/manus-storage/demo/a.png")).toBe(true);
    expect(isAllowedDetailImageUrl("ftp://cdn.example.com/a.png")).toBe(false);
    expect(isAllowedDetailImageUrl("data:image/png;base64,abc")).toBe(false);
  });

  it("returns explicit validation error for unsupported detail image url", () => {
    expect(getDetailImageValidationError("https://cdn.example.com/a.png\nftp://cdn.example.com/b.png")).toBe(
      "详情长图仅支持 http(s) 或 /manus-storage/ 开头的图片地址。请先修正后再保存。",
    );
  });

  it("returns explicit validation error when detail image count exceeds limit", () => {
    const tooManyImages = Array.from({ length: 9 }, (_, index) => `https://cdn.example.com/${index + 1}.png`).join("\n");
    expect(getDetailImageValidationError(tooManyImages)).toBe("详情长图当前最多支持 8 张，请先删减后再保存。");
  });

  it("returns null when detail image input is valid", () => {
    expect(
      getDetailImageValidationError("https://cdn.example.com/a.png\n/manus-storage/demo/b.png\nhttps://cdn.example.com/c.png"),
    ).toBeNull();
  });

  it("renders SKU and subscription configuration entrypoints for operators", () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminProductsWorkbench, {
        activeBrandId: 1,
        selectedBrandName: "环洗朵",
        brandOptions: [{ id: 1, code: "huanxiduo", name: "环洗朵", shortName: "Huanxiduo" }],
      }),
    );

    expect(html).toContain("SKU &amp; Tier Pricing / 规格、库存与阶梯价");
    expect(html).toContain("Subscription Plans / 服务订阅与周期计划");
    expect(html).toContain("新增 SKU");
    expect(html).toContain("新增订阅计划");
  });

  it("shows brand-scoped inventory signals for tracked products", () => {
    managedProductsDataMock.products = [
      {
        id: 101,
        brandId: 1,
        brandName: "环洗朵",
        code: "HXD-LINEN-01",
        name: "高浓缩织物洁净剂",
        slug: "hxd-linen-01",
        series: "AP",
        productType: "physical",
        price: 1280,
        status: "active",
        imageUrl: "https://cdn.example.com/linen.png",
        subtitle: "酒店布草主力清洁剂",
        description: "用于库存隔离测试",
        specs: [],
        updatedAt: "2026-05-26T00:00:00.000Z",
        skus: [
          { skuCode: "HXD-LINEN-01-A", stockQty: 4, status: "active" },
          { skuCode: "HXD-LINEN-01-B", stockQty: 0, status: "active" },
        ],
        subscriptionPlans: [],
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(AdminProductsWorkbench, {
        activeBrandId: 1,
        selectedBrandName: "环洗朵",
        brandOptions: [{ id: 1, code: "huanxiduo", name: "环洗朵", shortName: "Huanxiduo" }],
      }),
    );

    expect(html).toContain("库存跟踪 SKU");
    expect(html).toContain("低库存 / 缺货");
    expect(html).toContain("可售库存 4");
    expect(html).toContain("低库存预警 1 个");
    expect(html).toContain("缺货 SKU 1 个");
    expect(html).toContain("环洗朵");
  });

  it("renders empty state for brand-scoped product pool", () => {
    managedProductsDataMock.products = [];

    const html = renderToStaticMarkup(
      React.createElement(AdminProductsWorkbench, {
        activeBrandId: 1,
        selectedBrandName: "环洗朵",
        brandOptions: [{ id: 1, code: "huanxiduo", name: "环洗朵", shortName: "Huanxiduo" }],
      }),
    );

    expect(html).toContain("当前筛选结果为空");
    expect(html).toContain("录入首个测试商品");
  });

  it("renders error state when managed product query fails", () => {
    managedProductsQueryStateMock.isError = true;

    const html = renderToStaticMarkup(
      React.createElement(AdminProductsWorkbench, {
        activeBrandId: 1,
        selectedBrandName: "环洗朵",
        brandOptions: [{ id: 1, code: "huanxiduo", name: "环洗朵", shortName: "Huanxiduo" }],
      }),
    );

    expect(html).toContain("商品池读取失败，请重试后继续录入");
  });
});
