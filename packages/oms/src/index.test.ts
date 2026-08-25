import { beforeEach, describe, expect, it, vi } from "vitest";

const { priceOrderItemsMock } = vi.hoisted(() => ({
  priceOrderItemsMock: vi.fn(),
}));

vi.mock("../../pim/src/index", async () => {
  const actual = await vi.importActual<typeof import("../../pim/src/index")>("../../pim/src/index");
  return {
    ...actual,
    priceOrderItems: priceOrderItemsMock,
  };
});

import { createOrder, resolveUn1266LogisticsCompliance } from "./index";

type FakeSkuRow = {
  id: number;
  brandId: number;
  productId: number;
  stockQty: number;
};

type FakeProductRow = {
  id: number;
  brandId: number;
  name: string;
  productType: "physical" | "service" | "rental" | "subscription";
  priceUsd?: number | null;
};

type FakeProductComponentRow = {
  id: number;
  brandId: number;
  type: "HEAD" | "BODY_WRAP" | "BASE";
  name: string;
  material: string | null;
  extraPrice: number;
  extraPriceUsd: number | null;
  status: "active" | "inactive" | "archived";
};

function createThenableRows<T>(rows: T[]) {
  return {
    limit(count: number) {
      return Promise.resolve(rows.slice(0, count));
    },
    then(resolve: (value: T[]) => unknown) {
      return Promise.resolve(resolve(rows));
    },
  };
}

function createFakeDb(
  initialStockQty: number,
  productType: FakeProductRow["productType"] = "physical",
  options?: {
    failInventoryUpdate?: boolean;
    productPriceUsd?: number | null;
    components?: FakeProductComponentRow[];
  },
) {
  const state = {
    executedQueries: [] as unknown[],
    products: [
      {
        id: 101,
        brandId: 2,
        name: "库存验证样品",
        productType,
        priceUsd: options?.productPriceUsd ?? null,
      } satisfies FakeProductRow,
    ],
    productComponents: options?.components ?? [],
    productSkus: [
      {
        id: 11,
        brandId: 2,
        productId: 101,
        stockQty: initialStockQty,
      } satisfies FakeSkuRow,
    ],
    orders: [] as Array<{ id: number; orderNo: string; payableAmount: number; paymentStatus: string; status: string; currency: string; userId: number; brandId: number; orderType: string; logisticsJson?: unknown }> ,
    payments: [] as Array<{ id: number; orderId: number; provider: string; amount: number; status: string; paymentScenario?: string }>,
    orderItems: [] as Array<{ orderId: number; skuId: number; quantity: number; lineAmount: number; unitPrice?: number; customizationJson?: unknown }>,
  };

  let nextOrderId = 900;
  let nextPaymentId = 1200;

  const tx = {
    async execute(query: unknown) {
      state.executedQueries.push(query);
      return [];
    },
    select() {
      return {
        from(table: { brand?: string; [key: string]: unknown }) {
          const tableName = table[Symbol.for("drizzle:Name")] ?? table;
          const resolveRows = () => {
            if (tableName === "products") return state.products;
            if (tableName === "product_components") return state.productComponents;
            if (tableName === "productSkus") return state.productSkus;
            if (tableName === "orders") return state.orders;
            if (tableName === "payments") return state.payments;
            return [];
          };
          return {
            where() {
              return createThenableRows(resolveRows() as never[]);
            },
            limit(count: number) {
              return Promise.resolve((resolveRows() as never[]).slice(0, count));
            },
          };
        },
      };
    },
    update(table: { [key: string]: unknown }) {
      const tableName = table[Symbol.for("drizzle:Name")] ?? table;
      return {
        set(values: { stockQty?: number }) {
          return {
            async where() {
              if (tableName === "productSkus" && typeof values.stockQty === "number") {
                if (options?.failInventoryUpdate) {
                  return { affectedRows: 0 };
                }
                state.productSkus[0].stockQty = values.stockQty;
                return { affectedRows: 1 };
              }
              return { affectedRows: 1 };
            },
          };
        },
      };
    },
    insert(table: { [key: string]: unknown }) {
      const tableName = table[Symbol.for("drizzle:Name")] ?? table;
      return {
        values(values: unknown) {
          if (tableName === "orderItems") {
            state.orderItems.push(...(values as Array<{ orderId: number; skuId: number; quantity: number; lineAmount: number; unitPrice?: number; customizationJson?: unknown }>));
            return Promise.resolve([]);
          }

          return {
            async $returningId() {
              if (tableName === "orders") {
                const payload = values as { brandId: number; userId: number; orderNo: string; payableAmount: number; paymentStatus: string; status: string; currency: string; orderType: string; logisticsJson?: unknown };
                state.orders.push({
                  id: nextOrderId,
                  brandId: payload.brandId,
                  userId: payload.userId,
                  orderNo: payload.orderNo,
                  payableAmount: payload.payableAmount,
                  paymentStatus: payload.paymentStatus,
                  status: payload.status,
                  currency: payload.currency,
                  orderType: payload.orderType,
                  logisticsJson: payload.logisticsJson,
                });
                return [{ id: nextOrderId++ }];
              }
              if (tableName === "payments") {
                const payload = values as { orderId: number; provider: string; amount: number; status: string; paymentScenario?: string };
                state.payments.push({
                  id: nextPaymentId,
                  orderId: payload.orderId,
                  provider: payload.provider,
                  amount: payload.amount,
                  status: payload.status,
                  paymentScenario: payload.paymentScenario,
                });
                return [{ id: nextPaymentId++ }];
              }
              return [];
            },
          };
        },
      };
    },
  };

  return {
    state,
    db: {
      transaction: async <T>(callback: (tx: typeof tx) => Promise<T>) => callback(tx),
    },
  };
}

describe("OMS createOrder inventory guard", () => {
  beforeEach(() => {
    priceOrderItemsMock.mockReset();
  });

  it("deducts sku stock when inventory is sufficient", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [
        {
          item: { productId: 101, skuId: 11, quantity: 2 },
          sku: { id: 11, productId: 101, specName: "500ml", packSize: "瓶" },
          product: { id: 101, name: "库存验证样品" },
          unitPrice: 199,
          lineAmount: 398,
          matchedTier: null,
        },
      ],
      subtotalAmount: 398,
    });

    const { db, state } = createFakeDb(5);
    const result = await createOrder({
      db: db as never,
      brandId: 2,
      userId: 88,
      customerType: "b2c",
      items: [{ productId: 101, skuId: 11, quantity: 2 }],
    });

    expect(state.productSkus[0].stockQty).toBe(3);
    expect(state.orderItems[0]?.quantity).toBe(2);
    expect(result.order.payableAmount).toBe(398);
  });

  it("uses USD product/component prices and records a complete lantern customization snapshot", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [
        {
          item: { productId: 101, skuId: 11, quantity: 1 },
          sku: { id: 11, productId: 101, specName: "Lantern", packSize: "1 set" },
          product: { id: 101, name: "秉烛灯笼香水" },
          unitPrice: 680,
          lineAmount: 680,
          matchedTier: null,
        },
      ],
      subtotalAmount: 680,
    });
    const { db, state } = createFakeDb(4, "physical", {
      productPriceUsd: 64,
      components: [
        { id: 201, brandId: 2, type: "HEAD", name: "折光铜冠", material: "铜", extraPrice: 120, extraPriceUsd: 8, status: "active" },
        { id: 202, brandId: 2, type: "BODY_WRAP", name: "雨窗宣纸", material: "宣纸", extraPrice: 80, extraPriceUsd: 6, status: "active" },
        { id: 203, brandId: 2, type: "BASE", name: "悬挂铜环", material: "铜", extraPrice: 40, extraPriceUsd: 3, status: "active" },
      ],
    });

    const result = await createOrder({
      db: db as never,
      brandId: 2,
      userId: 88,
      customerType: "b2c",
      currency: "USD",
      items: [{ productId: 101, skuId: 11, quantity: 1 }],
      customization: { components: [{ componentId: 201 }, { componentId: 202 }, { componentId: 203 }] },
      payment: { provider: "wechat_jsapi" },
    });

    expect(result.order.currency).toBe("USD");
    expect(result.order.payableAmount).toBe(81);
    expect(state.orderItems[0]?.unitPrice).toBe(81);
    expect(state.orderItems[0]?.lineAmount).toBe(81);
    expect(state.orderItems[0]?.customizationJson).toMatchObject({
      kind: "bingzhu_lantern",
      components: expect.arrayContaining([expect.objectContaining({ type: "HEAD" }), expect.objectContaining({ type: "BODY_WRAP" }), expect.objectContaining({ type: "BASE" })]),
    });
  });

  it("rejects a non-CNY/USD settlement currency before writing an order", async () => {
    const { db } = createFakeDb(5);
    await expect(
      createOrder({
        db: db as never,
        brandId: 2,
        userId: 88,
        items: [{ productId: 101, skuId: 11, quantity: 1 }],
        currency: "EUR" as never,
      }),
    ).rejects.toThrow("当前订单仅支持 CNY 或 USD 结算。");
  });

  it("routes airport-restricted UN1266 orders to hazardous-goods ground delivery", () => {
    expect(resolveUn1266LogisticsCompliance({ recipientRegion: "上海浦东国际机场物流园", fulfillmentMethod: "ground_delivery" })).toMatchObject({
      requiresComplianceRouting: true,
      dispatchMode: "hazmat_ground_delivery",
      material: "UN1266",
    });
  });

  it("routes immediate pickup of UN1266 goods through a compliance warehouse and persists the decision", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [{
        item: { productId: 101, skuId: 11, quantity: 1 },
        sku: { id: 11, productId: 101, specName: "15ml", packSize: "瓶" },
        product: { id: 101, name: "秉烛探窗" },
        unitPrice: 19800,
        lineAmount: 19800,
        matchedTier: null,
      }],
      subtotalAmount: 19800,
    });
    const { db, state } = createFakeDb(5);
    const result = await createOrder({
      db: db as never,
      brandId: 2,
      userId: 88,
      items: [{ productId: 101, skuId: 11, quantity: 1 }],
      logistics: { fulfillmentMethod: "instant_pickup", recipientRegion: "上海市黄浦区" },
    });

    expect(result.logisticsCompliance).toMatchObject({
      requiresComplianceRouting: true,
      dispatchMode: "compliance_warehouse_dispatch",
    });
    expect(state.orders[0]?.logisticsJson).toMatchObject({
      compliance: expect.objectContaining({ material: "UN1266", dispatchMode: "compliance_warehouse_dispatch" }),
    });
  });

  it("blocks order creation when sku stock is insufficient", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [
        {
          item: { productId: 101, skuId: 11, quantity: 6 },
          sku: { id: 11, productId: 101, specName: "500ml", packSize: "瓶" },
          product: { id: 101, name: "库存验证样品" },
          unitPrice: 199,
          lineAmount: 1194,
          matchedTier: null,
        },
      ],
      subtotalAmount: 1194,
    });

    const { db, state } = createFakeDb(5);

    await expect(
      createOrder({
        db: db as never,
        brandId: 2,
        userId: 88,
        customerType: "b2c",
        items: [{ productId: 101, skuId: 11, quantity: 6 }],
      }),
    ).rejects.toThrow("库存不足");

    expect(state.productSkus[0].stockQty).toBe(5);
    expect(state.orders).toHaveLength(0);
    expect(state.payments).toHaveLength(0);
  });

  it("returns conflict when inventory changed during deduction", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [
        {
          item: { productId: 101, skuId: 11, quantity: 2 },
          sku: { id: 11, productId: 101, specName: "500ml", packSize: "瓶" },
          product: { id: 101, name: "库存验证样品" },
          unitPrice: 199,
          lineAmount: 398,
          matchedTier: null,
        },
      ],
      subtotalAmount: 398,
    });

    const { db, state } = createFakeDb(5, "physical", { failInventoryUpdate: true });

    await expect(
      createOrder({
        db: db as never,
        brandId: 2,
        userId: 88,
        customerType: "b2c",
        items: [{ productId: 101, skuId: 11, quantity: 2 }],
      }),
    ).rejects.toThrow("库存已被其他订单占用，请刷新后重试");

    expect(state.productSkus[0].stockQty).toBe(5);
    expect(state.orders).toHaveLength(0);
    expect(state.payments).toHaveLength(0);
  });

  it("locks physical sku rows before deducting inventory when native execute is available", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [
        {
          item: { productId: 101, skuId: 11, quantity: 1 },
          sku: { id: 11, productId: 101, specName: "500ml", packSize: "瓶" },
          product: { id: 101, name: "库存验证样品" },
          unitPrice: 199,
          lineAmount: 199,
          matchedTier: null,
        },
      ],
      subtotalAmount: 199,
    });

    const { db, state } = createFakeDb(5, "physical");

    await createOrder({
      db: db as never,
      brandId: 2,
      userId: 88,
      customerType: "b2c",
      items: [{ productId: 101, skuId: 11, quantity: 1 }],
    });

    expect(state.executedQueries).toHaveLength(1);
  });

  it("creates subscription orders without reserving physical inventory", async () => {
    priceOrderItemsMock.mockResolvedValue({
      pricedItems: [
        {
          item: { productId: 101, skuId: 11, quantity: 1 },
          sku: { id: 11, productId: 101, specName: "月度计划", packSize: "套" },
          product: { id: 101, name: "DaaS 月度焕新计划" },
          unitPrice: 1299,
          lineAmount: 1299,
          matchedTier: null,
        },
      ],
      subtotalAmount: 1299,
    });

    const { db, state } = createFakeDb(0, "subscription");
    const result = await createOrder({
      db: db as never,
      brandId: 2,
      userId: 88,
      customerType: "b2c",
      items: [{ productId: 101, skuId: 11, quantity: 1 }],
      payment: {
        provider: "wechat_jsapi",
        paymentScenario: "installment",
        installmentPlanCode: "MONTHLY-DAAS",
      },
    });

    expect(state.productSkus[0].stockQty).toBe(0);
    expect(result.order.orderType).toBe("subscription");
    expect(result.payment.paymentScenario).toBe("installment");
  });
});
