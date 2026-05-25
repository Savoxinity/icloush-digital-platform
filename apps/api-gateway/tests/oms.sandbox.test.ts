import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { orders, paymentCallbackLogs, payments } from "../../../packages/database/schema";
import {
  advanceOrderToProcessing,
  completeOrder,
  scheduleSandboxOrderPaymentSettlement,
  settleSandboxOrderPayment,
  shipOrder,
} from "../../../packages/oms/src/index";

type MutableOrderState = {
  id: number;
  brandId: number;
  status: "pending_payment" | "paid" | "processing" | "shipped" | "completed" | "closed" | "cancelled";
  paymentStatus: "unpaid" | "paid";
  fulfillmentStatus: "unfulfilled" | "processing" | "shipped" | "delivered";
  note: string | null;
  updatedAt: Date;
};

type MutablePaymentState = {
  id: number;
  brandId: number;
  orderId: number;
  provider: "wechat_jsapi" | "alipay" | "offline_bank_transfer";
  status: "created" | "paid" | "cancelled";
  metaJson: Record<string, unknown>;
  paidAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function createSandboxDbFixture() {
  const state: {
    order: MutableOrderState;
    payment: MutablePaymentState;
    callbackLogs: Array<Record<string, unknown>>;
  } = {
    order: {
      id: 101,
      brandId: 2,
      status: "pending_payment",
      paymentStatus: "unpaid",
      fulfillmentStatus: "unfulfilled",
      note: null,
      updatedAt: new Date("2026-04-19T00:00:00.000Z"),
    },
    payment: {
      id: 202,
      brandId: 2,
      orderId: 101,
      provider: "wechat_jsapi",
      status: "created",
      metaJson: {},
      paidAt: null,
      createdAt: new Date("2026-04-19T00:00:00.000Z"),
      updatedAt: new Date("2026-04-19T00:00:00.000Z"),
    },
    callbackLogs: [],
  };

  const db: any = {
    select() {
      return {
        from(table: unknown) {
          return {
            where() {
              return {
                limit() {
                  if (table === orders) {
                    return Promise.resolve([state.order]);
                  }

                  if (table === payments) {
                    return Promise.resolve([state.payment]);
                  }

                  return Promise.resolve([]);
                },
              };
            },
          };
        },
      };
    },
    update(table: unknown) {
      return {
        set(values: Record<string, unknown>) {
          return {
            where() {
              if (table === orders) {
                state.order = {
                  ...state.order,
                  ...(values as Partial<MutableOrderState>),
                };
              }

              if (table === payments) {
                state.payment = {
                  ...state.payment,
                  ...(values as Partial<MutablePaymentState>),
                };
              }

              return Promise.resolve();
            },
          };
        },
      };
    },
    insert(table: unknown) {
      return {
        values(values: Record<string, unknown>) {
          if (table === paymentCallbackLogs) {
            state.callbackLogs.push(values);
          }
          return Promise.resolve();
        },
      };
    },
    transaction<T>(fn: (tx: any) => Promise<T>) {
      return fn(db);
    },
  };

  return { db, state };
}

describe("oms sandbox settlement", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("settles a pending retail order into paid status", async () => {
    const { db, state } = createSandboxDbFixture();

    const result = await settleSandboxOrderPayment({
      db,
      brandId: 2,
      orderId: 101,
      paymentId: 202,
      outcome: "successful",
    });

    expect(result.skipped).toBe(false);
    expect(state.order.status).toBe("paid");
    expect(state.order.paymentStatus).toBe("paid");
    expect(state.payment.status).toBe("paid");
    expect(state.payment.metaJson).toMatchObject({ sandboxOutcome: "successful" });
    expect(state.callbackLogs).toHaveLength(1);
    expect(state.callbackLogs[0]).toMatchObject({
      brandId: 2,
      paymentId: 202,
      orderId: 101,
      provider: "wechat_jsapi",
      callbackType: "payment_notify",
      signatureStatus: "skipped",
      processStatus: "processed",
    });
  });

  it("auto-settles sandbox orders after the configured delay", async () => {
    const { db, state } = createSandboxDbFixture();

    const scheduled = scheduleSandboxOrderPaymentSettlement({
      db,
      brandId: 2,
      orderId: 101,
      paymentId: 202,
      delayMs: 5000,
      outcome: "closed",
    });

    expect(scheduled.scheduled).toBe(true);
    expect(scheduled.delayMs).toBe(5000);
    expect(state.order.status).toBe("pending_payment");

    await vi.advanceTimersByTimeAsync(5000);

    expect(state.order.status).toBe("closed");
    expect(state.order.paymentStatus).toBe("unpaid");
    expect(state.payment.status).toBe("cancelled");
    expect(state.payment.metaJson).toMatchObject({ sandboxOutcome: "closed" });
    expect(state.callbackLogs).toHaveLength(1);
    expect(state.callbackLogs[0]).toMatchObject({
      brandId: 2,
      paymentId: 202,
      orderId: 101,
      provider: "wechat_jsapi",
      callbackType: "payment_notify",
      signatureStatus: "skipped",
      processStatus: "processed",
    });
  });

  it("advances paid sandbox orders through processing, shipped, and completed states", async () => {
    const { db, state } = createSandboxDbFixture();

    await settleSandboxOrderPayment({
      db,
      brandId: 2,
      orderId: 101,
      paymentId: 202,
      outcome: "successful",
    });

    const processingResult = await advanceOrderToProcessing({
      db,
      brandId: 2,
      orderId: 101,
    });

    expect(processingResult.order.status).toBe("processing");
    expect(state.order.fulfillmentStatus).toBe("processing");

    const shippedResult = await shipOrder({
      db,
      brandId: 2,
      orderId: 101,
      trackingNo: "MOCK-TRACK-101",
    });

    expect(shippedResult.order.status).toBe("shipped");
    expect(shippedResult.trackingNo).toBe("MOCK-TRACK-101");
    expect(state.order.fulfillmentStatus).toBe("shipped");
    expect(state.order.note).toContain("虚拟物流单号：MOCK-TRACK-101");

    const completedResult = await completeOrder({
      db,
      brandId: 2,
      orderId: 101,
    });

    expect(completedResult.order.status).toBe("completed");
    expect(state.order.fulfillmentStatus).toBe("delivered");
  });
});
