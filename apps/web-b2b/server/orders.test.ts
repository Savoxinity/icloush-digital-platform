import * as omsModule from "../../../packages/oms/src/index";
import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn(async () => ({}) as never));

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

import { appRouter } from "./routers";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createUser(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    id: 1,
    openId: "sample-user",
    unionId: null,
    mobile: null,
    email: "sample@example.com",
    name: "Sample User",
    loginMethod: "manus",
    accountType: "personal",
    globalRole: "user",
    status: "active",
    createdAt: new Date("2026-04-01T00:00:00.000Z"),
    updatedAt: new Date("2026-04-01T00:00:00.000Z"),
    lastSignedIn: new Date("2026-04-01T00:00:00.000Z"),
    ...overrides,
  };
}

function createContext(user: AuthenticatedUser): TrpcContext {
  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => undefined,
    } as TrpcContext["res"],
  };
}

describe("admin orders router", () => {
  beforeEach(() => {
    getDbMock.mockClear();
    vi.restoreAllMocks();
  });

  it("queries admin order list through OMS with brand filters", async () => {
    const listSpy = vi.spyOn(omsModule, "listOrders").mockResolvedValue({
      total: 1,
      records: [
        {
          id: 101,
          brandId: 2,
          userId: 11,
          orderNo: "ORD-ADMIN-001",
          status: "under_review",
          paymentStatus: "offline_review",
          fulfillmentStatus: "unfulfilled",
          currency: "CNY",
          totalAmount: 398000,
          payableAmount: 398000,
          itemCount: 1,
          totalQuantity: 2,
          itemPreview: [],
          latestPayment: null,
          latestReceipt: null,
        },
      ],
    } as Awaited<ReturnType<typeof omsModule.listOrders>>);

    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "admin" })));
    const result = await caller.orders.list({ brandId: 2, status: "under_review", limit: 10 });

    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 2,
        status: "under_review",
        limit: 10,
      }),
    );
    expect(result.filters.brandId).toBe(2);
    expect(result.records[0]?.orderNo).toBe("ORD-ADMIN-001");
  });

  it("queries current user orders through OMS with authenticated user id", async () => {
    const listSpy = vi.spyOn(omsModule, "listOrders").mockResolvedValue({
      total: 1,
      records: [
        {
          id: 201,
          brandId: 1,
          userId: 1,
          orderNo: "ORD-ME-001",
          status: "processing",
          paymentStatus: "paid",
          fulfillmentStatus: "processing",
          currency: "CNY",
          totalAmount: 128800,
          payableAmount: 128800,
          itemCount: 1,
          totalQuantity: 1,
          itemPreview: [],
          latestPayment: null,
          latestReceipt: null,
        },
      ],
    } as Awaited<ReturnType<typeof omsModule.listOrders>>);

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.orders.myList({ brandId: 1, limit: 5 });

    expect(listSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 1,
        userId: 1,
        limit: 5,
      }),
    );
    expect(result.records[0]?.orderNo).toBe("ORD-ME-001");
  });

  it("blocks detail lookup when non-admin user requests another user's order", async () => {
    vi.spyOn(omsModule, "getOrderDetail").mockResolvedValue({
      summary: {
        id: 301,
        brandId: 1,
        userId: 99,
        orderNo: "ORD-DETAIL-001",
        status: "processing",
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        currency: "CNY",
        totalAmount: 268000,
        payableAmount: 268000,
      },
      items: [],
      payments: [],
      receipts: [],
    } as Awaited<ReturnType<typeof omsModule.getOrderDetail>>);

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));

    await expect(
      caller.orders.detail({ brandId: 1, orderNo: "ORD-DETAIL-001" }),
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "当前用户无权查看该订单。",
    });
  });

  it("queries admin review queue through OMS with review filters", async () => {
    const queueSpy = vi.spyOn(omsModule, "listOrderReviewQueue").mockResolvedValue({
      total: 1,
      records: [
        {
          order: {
            id: 401,
            brandId: 2,
            userId: 12,
            orderNo: "ORD-QUEUE-001",
            status: "under_review",
            paymentStatus: "offline_review",
            fulfillmentStatus: "unfulfilled",
            currency: "CNY",
            totalAmount: 398000,
            payableAmount: 398000,
            itemCount: 1,
            totalQuantity: 2,
            itemPreview: [],
            latestPayment: null,
            latestReceipt: null,
          },
          payment: {
            id: 801,
            orderId: 401,
            provider: "offline_bank_transfer",
            status: "reviewing",
          },
          receipt: {
            id: 901,
            orderId: 401,
            paymentId: 801,
            reviewStatus: "pending",
          },
          reviewStatus: "pending",
          reviewStage: "awaiting_finance_review",
        },
      ],
    } as Awaited<ReturnType<typeof omsModule.listOrderReviewQueue>>);

    const caller = appRouter.createCaller(createContext(createUser({ globalRole: "admin" })));
    const result = await caller.orders.reviewQueue({ brandId: 2, reviewStatus: "pending", limit: 5 });

    expect(queueSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 2,
        reviewStatus: "pending",
        limit: 5,
      }),
    );
    expect(result.records[0]?.receipt.reviewStatus).toBe("pending");
  });

  it("submits admin review action through OMS with reviewer id", async () => {
    const reviewSpy = vi.spyOn(omsModule, "reviewOrderPayment").mockResolvedValue({
      order: {
        id: 401,
        brandId: 2,
        userId: 12,
        orderNo: "ORD-QUEUE-001",
        status: "paid",
        paymentStatus: "paid",
        fulfillmentStatus: "processing",
        currency: "CNY",
        totalAmount: 398000,
        payableAmount: 398000,
      },
      payment: {
        id: 801,
        orderId: 401,
        provider: "offline_bank_transfer",
        status: "paid",
      },
      receipt: {
        id: 901,
        orderId: 401,
        paymentId: 801,
        reviewStatus: "approved",
      },
    } as Awaited<ReturnType<typeof omsModule.reviewOrderPayment>>);

    const caller = appRouter.createCaller(createContext(createUser({ id: 88, globalRole: "admin" })));
    const result = await caller.orders.reviewPayment({
      brandId: 2,
      orderId: 401,
      paymentId: 801,
      receiptId: 901,
      approved: true,
      reviewNote: "财务审核通过",
    });

    expect(reviewSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 2,
        orderId: 401,
        paymentId: 801,
        receiptId: 901,
        approved: true,
        reviewNote: "财务审核通过",
        reviewedBy: 88,
      }),
    );
    expect(result.receipt.reviewStatus).toBe("approved");
  });
});
