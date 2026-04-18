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
    brandCode: products[0]?.brandCode ?? "icloush-lab",
    brandName: products[0]?.brandName ?? "iCloush LAB.",
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
  const normalized = {
    id: input.id ?? nextId++,
    brandId: input.brandId,
    brandCode: "icloush-lab",
    brandName: "iCloush LAB.",
    code: input.code.trim().toUpperCase(),
    name: input.name.trim(),
    slug,
    series: input.series ?? null,
    price: typeof input.price === "number" ? input.price : null,
    status: input.status ?? "draft",
    imageUrl: input.imageUrl ?? null,
    subtitle: input.subtitle ?? null,
    description: input.description ?? null,
    specs: input.specs ?? [],
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
  };
});

import { appRouter as adminAppRouter } from "./routers";
import { appRouter as webB2BAppRouter } from "../../web-b2b/server/routers";
import { ShowroomPage, type ShowroomProduct } from "../../web-b2b/src/App";

function setLocation(pathname: string) {
  Object.defineProperty(globalThis, "location", {
    value: new URL(`https://example.com${pathname}`),
    configurable: true,
  });
}

function toShowroomProduct(record: (typeof sharedProducts)[number]): ShowroomProduct {
  return {
    id: record.slug,
    code: record.code,
    name: record.name,
    subtitle: record.subtitle ?? "Atmospheric Purification / database synced object",
    series: record.series ?? "AP",
    price: record.price ?? 0,
    size: "SHOWROOM ASSET",
    layout: "full",
    source: "database",
    heroLine: record.description ?? `${record.name} 已通过后台录入并同步到零售展陈前台。`,
    formulation: record.specs.map((item) => `${item.key} // ${item.value}`).join(" // "),
    discipline: record.series === "FC" ? "Fabric Care Deluxe" : "Atmospheric Purification",
    overview: record.description ?? "后台录入完成后，前台应立即可见。",
    notes: record.specs.map((item) => `${item.key}：${item.value}`),
    stats: record.specs.map((item, index) => ({ label: item.key, value: item.value, emphasis: index === 0 ? "primary" : "secondary" })),
    accent: {
      glow: "rgba(111, 142, 255, 0.34)",
      metal: "linear-gradient(145deg, rgba(246,242,235,0.22), rgba(59,66,89,0.04) 42%, rgba(9,11,22,0.92) 78%)",
      liquid: "linear-gradient(180deg, rgba(36,45,89,0.85), rgba(10,12,22,0.2))",
    },
  };
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
        { key: "验证批次", value: "SPRINT3" },
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

    setLocation("/gallery");
    const html = renderToStaticMarkup(
      React.createElement(ShowroomPage, {
        products: [toShowroomProduct(detail)],
        sourceLabel: "DATABASE",
      }),
    );
    expect(html).toContain("联通验证样品");
    expect(html).toContain("TEST-X01");
    expect(html).toContain("DATABASE");
    expect(html).toContain("/object/test-x01");
  });
});
