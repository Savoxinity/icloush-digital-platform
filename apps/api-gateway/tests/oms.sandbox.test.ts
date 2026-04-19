import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { orders, payments } from "../../../packages/database/schema";
import {
  scheduleSandboxOrderPaymentSettlement,
  settleSandboxOrderPayment,
} from "../../../packages/oms/src/index";

type MutableOrderState = {
  id: number;
  brandId: number;
  status: "pending_payment" | "paid" | "closed" | "cancelled";
  paymentStatus: "unpaid" | "paid";
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
  } = {
    order: {
      id: 101,
      brandId: 2,
      status: "pending_payment",
      paymentStatus: "unpaid",
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
  });
});
