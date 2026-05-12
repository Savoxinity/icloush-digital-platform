import { beforeEach, describe, expect, it, vi } from "vitest";

const priceOrderItemsMock = vi.fn();

vi.mock("../../pim/src/index", async () => {
  const actual = await vi.importActual<typeof import("../../pim/src/index")>("../../pim/src/index");
  return {
    ...actual,
    priceOrderItems: priceOrderItemsMock,
  };
});

import { createOrder } from "./index";

type FakeSkuRow = {
  id: number;
  brandId: number;
  productId: number;
  stockQty: number;
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

function createFakeDb(initialStockQty: number) {
  const state = {
    productSkus: [
      {
        id: 11,
        brandId: 2,
        productId: 101,
        stockQty: initialStockQty,
      } satisfies FakeSkuRow,
    ],
    orders: [] as Array<{ id: number; orderNo: string; payableAmount: number; paymentStatus: string; status: string; currency: string; userId: number; brandId: number }> ,
    payments: [] as Array<{ id: number; orderId: number; provider: string; amount: number; status: string }>,
    orderItems: [] as Array<{ orderId: number; skuId: number; quantity: number; lineAmount: number }>,
  };

  let nextOrderId = 900;
  let nextPaymentId = 1200;

  const tx = {
    select() {
      return {
        from(table: { brand?: string; [key: string]: unknown }) {
          const tableName = table[Symbol.for("drizzle:Name")] ?? table;
          const resolveRows = () => {
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
                state.productSkus[0].stockQty = values.stockQty;
              }
            },
          };
        },
      };
    },
    insert(table: { [key: string]: unknown }) {
      const tableName = table[Symbol.for("drizzle:Name")] ?? table;
      return {
        values(values: unknown) {
          return {
            async $returningId() {
              if (tableName === "orders") {
                const payload = values as { brandId: number; userId: number; orderNo: string; payableAmount: number; paymentStatus: string; status: string; currency: string };
                state.orders.push({
                  id: nextOrderId,
                  brandId: payload.brandId,
                  userId: payload.userId,
                  orderNo: payload.orderNo,
                  payableAmount: payload.payableAmount,
                  paymentStatus: payload.paymentStatus,
                  status: payload.status,
                  currency: payload.currency,
                });
                return [{ id: nextOrderId++ }];
              }
              if (tableName === "payments") {
                const payload = values as { orderId: number; provider: string; amount: number; status: string };
                state.payments.push({
                  id: nextPaymentId,
                  orderId: payload.orderId,
                  provider: payload.provider,
                  amount: payload.amount,
                  status: payload.status,
                });
                return [{ id: nextPaymentId++ }];
              }
              if (tableName === "orderItems") {
                state.orderItems.push(...(values as Array<{ orderId: number; skuId: number; quantity: number; lineAmount: number }>));
                return [];
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
});
