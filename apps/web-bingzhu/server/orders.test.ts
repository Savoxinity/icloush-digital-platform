import * as omsModule from "../../../packages/oms/src/index";
import * as paymentsModule from "../../../packages/payments/src/index";
import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getDbMock = vi.hoisted(() => vi.fn(async () => ({}) as never));
const getManagedProductDetailMock = vi.hoisted(() => vi.fn(async () => ({ id: 101, specs: [] }) as never));
const getBingzhuCatalogMock = vi.hoisted(() => vi.fn(async () => ({ source: "database", brandId: 30002, products: [], components: [] }) as never));

vi.mock("./db", () => ({
  getDb: getDbMock,
  getBingzhuCatalog: getBingzhuCatalogMock,
  getManagedProductDetail: getManagedProductDetailMock,
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
    getBingzhuCatalogMock.mockReset();
    getBingzhuCatalogMock.mockResolvedValue({ source: "database", brandId: 30002, products: [], components: [] } as never);
    getManagedProductDetailMock.mockReset();
    getManagedProductDetailMock.mockResolvedValue({ id: 101, specs: [] } as never);
    vi.restoreAllMocks();
    vi.spyOn(omsModule, "settleSandboxOrderPayment").mockImplementation(async ({ orderId, paymentId }) => ({
      order: {
        id: orderId,
        orderNo: `ORD-SANDBOX-SETTLED-${orderId}`,
        payableAmount: 0,
        currency: "CNY",
        status: "paid",
        paymentStatus: "paid",
        fulfillmentStatus: "unfulfilled",
      },
      payment: { id: paymentId, provider: "wechat_jsapi", status: "paid" },
      skipped: false,
      outcome: "successful",
    } as never));
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

  it("exposes the BINGZHU catalog with its isolated brand id, USD SKU price, and component directory", async () => {
    getBingzhuCatalogMock.mockResolvedValue({
      source: "database",
      brandId: 30002,
      products: [{
        id: 880,
        code: "BZ-YL-03",
        slug: "tanchuang",
        name: "探窗",
        subtitle: null,
        description: null,
        priceCny: 68000,
        priceUsd: 9500,
        skus: [{ id: 881, skuCode: "BZ-YL-03-15", specName: "探窗", packSize: "15ml", basePriceCny: 19800, priceUsd: 2800, stockQty: 108 }],
      }],
      components: [{ id: 901, type: "HEAD", name: "嫩戗飞檐盖头", material: "手工錾刻铜", extraPriceCny: 12000, extraPriceUsd: 1700, imageUrl: null }],
    } as never);

    const caller = appRouter.createCaller(createContext(createUser()));
    const result = await caller.bingzhu.catalog();

    expect(getBingzhuCatalogMock).toHaveBeenCalledTimes(1);
    expect(result.brandId).toBe(30002);
    expect(result.products[0]?.skus[0]?.priceUsd).toBe(2800);
    expect(result.components[0]).toMatchObject({ type: "HEAD", extraPriceCny: 12000 });
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

  it("defaults retail order to synchronous sandbox success when product payment mode is absent", async () => {
    getManagedProductDetailMock.mockResolvedValue({ id: 500, specs: [] } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7000, orderNo: "ORD-RET-DEFAULT-SANDBOX", payableAmount: 980, currency: "CNY" },
      items: [{ product: { name: "默认沙盒样品" }, item: { quantity: 1 }, sku: { id: 600 } }],
      payment: { id: 9000, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3", stage: "pending_configuration", providerOrderId: null, clientPayload: null, requiredConfigs: [], requestSnapshot: {}, notes: [],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({ brandId: 2, items: [{ productId: 500, skuId: 600, quantity: 1 }], gateway: "wechat_pay_v3", origin: "https://example.com" });

    expect(createOrderSpy).toHaveBeenCalledWith(expect.objectContaining({ sandbox: expect.objectContaining({ autoSettle: false }), payment: expect.objectContaining({ paymentScenario: "full_payment" }) }));
    expect(gatewaySpy).not.toHaveBeenCalled();
    expect(result.paymentMode).toBe("sandbox");
    expect(result.gateway.stage).toBe("completed");
    expect(result.paymentPolling.sandboxExpectedSettlementMs).toBe(0);
    expect(result.order).toMatchObject({ status: "paid", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" });
  });

  it("passes USD and a complete lantern component selection through synchronous sandbox success", async () => {
    getManagedProductDetailMock.mockResolvedValue({ id: 504, specs: [] } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7004, orderNo: "ORD-BINGZHU-USD", payableAmount: 81, currency: "USD" },
      items: [{ product: { name: "秉烛灯笼香水" }, item: { quantity: 1 }, sku: { id: 604 } }],
      payment: { id: 9004, provider: "wechat_jsapi" },
      logisticsCompliance: { material: "UN1266", requiresComplianceRouting: true, dispatchMode: "hazmat_ground_delivery", reasons: ["收货地址命中航空禁运/机场物流区域关键词"], notice: "危化品陆运" },
    } as never);
    vi.mocked(omsModule.settleSandboxOrderPayment).mockResolvedValueOnce({
      order: { id: 7004, orderNo: "ORD-BINGZHU-USD", payableAmount: 81, currency: "USD", status: "paid", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" },
      payment: { id: 9004, provider: "wechat_jsapi", status: "paid" },
      skipped: false,
      outcome: "successful",
    } as never);
    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({ brandId: 2, items: [{ productId: 504, skuId: 604, quantity: 1 }], gateway: "wechat_pay_v3", currency: "USD", customization: { components: [{ componentId: 201 }, { componentId: 202 }, { componentId: 203 }] }, logistics: { fulfillmentMethod: "ground_delivery", recipientRegion: "上海浦东机场物流园" }, origin: "https://example.com" });

    expect(createOrderSpy).toHaveBeenCalledWith(expect.objectContaining({ brandId: 2, currency: "USD", customization: { components: [{ componentId: 201 }, { componentId: 202 }, { componentId: 203 }] }, logistics: { fulfillmentMethod: "ground_delivery", recipientRegion: "上海浦东机场物流园" }, sandbox: expect.objectContaining({ autoSettle: false }) }));
    expect(result.order.currency).toBe("USD");
    expect(result.gateway.stage).toBe("completed");
    expect(result.logisticsCompliance).toMatchObject({ dispatchMode: "hazmat_ground_delivery", material: "UN1266" });
  });

  it("creates retail order in sandbox mode without touching formal gateway", async () => {
    getManagedProductDetailMock.mockResolvedValue({
      id: 501,
      specs: [{ key: "__retail_payment_mode", value: "sandbox" }],
    } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7001, orderNo: "ORD-RET-SANDBOX", payableAmount: 1280, currency: "CNY" },
      items: [{ product: { name: "Sandbox 样品" }, item: { quantity: 1 }, sku: { id: 601 } }],
      payment: { id: 9001, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "pending_configuration",
      providerOrderId: null,
      clientPayload: null,
      requiredConfigs: [],
      requestSnapshot: {},
      notes: [],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({
      brandId: 2,
      items: [{ productId: 501, skuId: 601, quantity: 1 }],
      gateway: "wechat_pay_v3",
      origin: "https://example.com",
    });

    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sandbox: expect.objectContaining({ autoSettle: false }),
        payment: expect.objectContaining({ paymentScenario: "full_payment" }),
      }),
    );
    expect(gatewaySpy).not.toHaveBeenCalled();
    expect(result.paymentMode).toBe("sandbox");
    expect(result.gateway.stage).toBe("completed");
    expect(result.paymentPolling.sandboxExpectedSettlementMs).toBe(0);
  });

  it("creates subscription retail order with installment metadata in sandbox mode", async () => {
    getManagedProductDetailMock.mockResolvedValue({
      id: 601,
      productType: "subscription",
      subscriptionPlans: [
        { id: 9101, name: "月度焕新计划", billingCycle: "monthly", price: 129900, status: "active" },
      ],
      specs: [{ key: "__retail_payment_mode", value: "sandbox" }],
    } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7601, orderNo: "ORD-RET-SUB", payableAmount: 1299, currency: "CNY" },
      items: [{ product: { name: "DaaS 月度焕新计划" }, item: { quantity: 1 }, sku: { id: 661 } }],
      payment: { id: 9601, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "pending_configuration",
      providerOrderId: null,
      clientPayload: null,
      requiredConfigs: [],
      requestSnapshot: {},
      notes: [],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({
      brandId: 2,
      items: [{ productId: 601, skuId: 661, quantity: 1 }],
      gateway: "wechat_pay_v3",
      origin: "https://example.com",
      note: "客户要求按月结算",
    });

    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        note: expect.stringContaining("订阅计划：月度焕新计划（按月）"),
        payment: expect.objectContaining({
          paymentScenario: "installment",
          installmentPlanCode: "RET-601-MONTHLY-9101",
        }),
        sandbox: expect.objectContaining({ autoSettle: false }),
      }),
    );
    expect(gatewaySpy).not.toHaveBeenCalled();
    expect(result.paymentMode).toBe("sandbox");
    expect(result.gateway.stage).toBe("completed");
  });

  it("creates retail order in production_ready mode without sandbox auto settle", async () => {
    getManagedProductDetailMock.mockResolvedValue({
      id: 502,
      specs: [{ key: "__retail_payment_mode", value: "production_ready" }],
    } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7002, orderNo: "ORD-RET-READY", payableAmount: 2680, currency: "CNY" },
      items: [{ product: { name: "Ready 样品" }, item: { quantity: 1 }, sku: { id: 602 } }],
      payment: { id: 9002, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "pending_configuration",
      providerOrderId: null,
      clientPayload: null,
      requiredConfigs: [],
      requestSnapshot: {},
      notes: [],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({
      brandId: 2,
      items: [{ productId: 502, skuId: 602, quantity: 1 }],
      gateway: "wechat_pay_v3",
      origin: "https://example.com",
    });

    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        sandbox: expect.objectContaining({ autoSettle: false }),
        payment: expect.objectContaining({ paymentScenario: "offline_review" }),
      }),
    );
    expect(gatewaySpy).not.toHaveBeenCalled();
    expect(result.paymentMode).toBe("production_ready");
    expect(result.gateway.stage).toBe("ready_for_sdk");
    expect(result.paymentPolling.sandboxExpectedSettlementMs).toBeNull();
  });

  it("adds rental expression note when creating production_ready rental orders", async () => {
    getManagedProductDetailMock.mockResolvedValue({
      id: 702,
      productType: "rental",
      specs: [{ key: "__retail_payment_mode", value: "production_ready" }],
    } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7702, orderNo: "ORD-RET-RENTAL", payableAmount: 3999, currency: "CNY" },
      items: [{ product: { name: "香氛 FaaS 设备租赁" }, item: { quantity: 1 }, sku: { id: 662 } }],
      payment: { id: 9702, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "pending_configuration",
      providerOrderId: null,
      clientPayload: null,
      requiredConfigs: [],
      requestSnapshot: {},
      notes: [],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({
      brandId: 2,
      items: [{ productId: 702, skuId: 662, quantity: 1 }],
      gateway: "wechat_pay_v3",
      origin: "https://example.com",
    });

    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        note: expect.stringContaining("租赁方案：设备免押"),
        payment: expect.objectContaining({ paymentScenario: "offline_review" }),
        sandbox: expect.objectContaining({ autoSettle: false }),
      }),
    );
    expect(gatewaySpy).not.toHaveBeenCalled();
    expect(result.paymentMode).toBe("production_ready");
    expect(result.gateway.stage).toBe("ready_for_sdk");
  });

  it("creates retail order in production_live mode and calls payment gateway abstraction", async () => {
    getManagedProductDetailMock.mockResolvedValue({
      id: 503,
      specs: [{ key: "__retail_payment_mode", value: "production_live" }],
    } as never);
    vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7003, orderNo: "ORD-RET-LIVE", payableAmount: 3680, currency: "CNY" },
      items: [{ product: { name: "Live 样品" }, item: { quantity: 1 }, sku: { id: 603 } }],
      payment: { id: 9003, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "pending_configuration",
      providerOrderId: null,
      clientPayload: null,
      requiredConfigs: ["WECHAT_PAY_MCHID"],
      requestSnapshot: { orderNo: "ORD-RET-LIVE" },
      notes: ["正式支付配置待补齐"],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({
      brandId: 2,
      items: [{ productId: 503, skuId: 603, quantity: 1 }],
      gateway: "wechat_pay_v3",
      origin: "https://example.com",
      returnUrl: "https://example.com/order-result",
    });

    expect(gatewaySpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 2,
        orderNo: "ORD-RET-LIVE",
        metadata: expect.objectContaining({ paymentMode: "production_live" }),
      }),
    );
    expect(result.paymentMode).toBe("production_live");
    expect(result.gateway.stage).toBe("pending_configuration");
  });

  it("surfaces production_live payment metadata in retail order status", async () => {
    vi.spyOn(omsModule, "getOrderDetail").mockResolvedValue({
      summary: {
        id: 7301,
        brandId: 2,
        userId: 1,
        orderNo: "ORD-RET-LIVE-STATUS",
        status: "pending_payment",
        paymentStatus: "pending",
        fulfillmentStatus: "unfulfilled",
        currency: "CNY",
        totalAmount: 3680,
        payableAmount: 3680,
        latestPayment: {
          id: 9301,
          provider: "wechat_jsapi",
          status: "pending",
          metaJson: {
            paymentMode: "production_live",
            paymentGateway: "wechat_pay_v3",
          },
        },
      },
      items: [],
      payments: [
        {
          id: 9301,
          provider: "wechat_jsapi",
          status: "pending",
          metaJson: {
            paymentMode: "production_live",
            paymentGateway: "wechat_pay_v3",
          },
        },
      ],
      receipts: [],
    } as Awaited<ReturnType<typeof omsModule.getOrderDetail>>);

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.retailOrderStatus({ brandId: 2, orderNo: "ORD-RET-LIVE-STATUS" });

    expect(result.paymentMode).toBe("production_live");
    expect(result.paymentGateway).toBe("wechat_pay_v3");
    expect(result.paymentGatewayStage).toBe("processing");
    expect(result.transactionState).toBe("pending");
    expect(result.prompt).toContain("OFFICIAL PAYMENT CALLBACK");
  });

  it("passes Huanxiduo brand context into retail order creation for the sample shelf flow", async () => {
    getManagedProductDetailMock.mockResolvedValue({
      id: 601,
      brandId: 1,
      brandName: "环洗朵科技",
      specs: [{ key: "__retail_payment_mode", value: "sandbox" }],
    } as never);
    const createOrderSpy = vi.spyOn(omsModule, "createOrder").mockResolvedValue({
      order: { id: 7101, orderNo: "ORD-HXD-SANDBOX", payableAmount: 680, currency: "CNY" },
      items: [{ product: { name: "环洗朵高浓缩洁净剂" }, item: { quantity: 1 }, sku: { id: 1601 } }],
      payment: { id: 9101, provider: "wechat_jsapi" },
    } as never);
    const gatewaySpy = vi.spyOn(paymentsModule, "createPaymentOrder").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "pending_configuration",
      providerOrderId: null,
      clientPayload: null,
      requiredConfigs: [],
      requestSnapshot: { orderNo: "ORD-HXD-SANDBOX" },
      notes: [],
    });

    const caller = appRouter.createCaller(createContext(createUser({ id: 1, globalRole: "user" })));
    const result = await caller.retail.createRetailOrder({
      brandId: 1,
      items: [{ productId: 601, skuId: 1601, quantity: 1 }],
      gateway: "wechat_pay_v3",
      origin: "https://example.com",
    });

    expect(createOrderSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        brandId: 1,
        sandbox: expect.objectContaining({ autoSettle: false }),
      }),
    );
    expect(gatewaySpy).not.toHaveBeenCalled();
    expect(result.order).toMatchObject({ id: 7101, status: "paid", paymentStatus: "paid", fulfillmentStatus: "unfulfilled" });
    expect(result.paymentMode).toBe("sandbox");
  });
});
