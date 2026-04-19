import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";

const createOrderMock = vi.fn();
const getOrderDetailMock = vi.fn();
const createRestContextMock = vi.fn(async () => ({
  db: null,
  tenant: { brandId: 2, source: "header" as const },
  req: {} as never,
  res: {} as never,
}));

vi.mock("../src/gateway", () => ({
  createContext: vi.fn(),
  createRestContext: createRestContextMock,
  appRouter: {
    createCaller: vi.fn(() => ({
      orders: {
        create: createOrderMock,
        detail: getOrderDetailMock,
      },
    })),
  },
}));

describe("api-gateway retail REST endpoints", () => {
  let server: Server;
  let baseUrl = "";

  beforeAll(async () => {
    process.env.VITEST = "true";
    const mod = await import("../src/index");
    server = mod.app.listen(0);
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const address = server.address() as AddressInfo;
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("creates retail order and returns payment parameter envelope", async () => {
    createOrderMock.mockResolvedValueOnce({
      tenant: { brandId: 2, source: "header" },
      order: {
        id: 81,
        orderNo: "RTL-20260419-001",
        status: "pending_payment",
        paymentStatus: "pending",
        payableAmount: 128000,
        currency: "CNY",
      },
      payment: {
        provider: "wechat_jsapi",
        status: "pending",
      },
      paymentIntent: {
        appId: "wx-demo",
        timeStamp: "1713492000",
      },
    });

    const response = await fetch(`${baseUrl}/api/orders/retail`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        brandId: 2,
        userId: 7,
        gateway: "wechat_pay_v3",
        items: [{ skuId: 19001, quantity: 1 }],
      }),
    });
    const payload = (await response.json()) as any;

    expect(response.status).toBe(201);
    expect(createRestContextMock).toHaveBeenCalled();
    expect(createOrderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 7,
        customerType: "b2c",
        items: [{ skuId: 19001, quantity: 1 }],
      }),
    );
    expect(payload.ok).toBe(true);
    expect(payload.order.orderNo).toBe("RTL-20260419-001");
    expect(payload.paymentParameters.gateway).toBe("wechat_pay_v3");
    expect(payload.paymentParameters.wechatPay).toMatchObject({ appId: "wx-demo" });
  });

  it("maps bad request errors for retail order creation", async () => {
    createOrderMock.mockRejectedValueOnce(new Error("零售订单创建失败。"));

    const response = await fetch(`${baseUrl}/api/orders/retail`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ brandId: 2 }),
    });
    const payload = (await response.json()) as any;

    expect(response.status).toBe(500);
    expect(payload).toMatchObject({ ok: false, message: "零售订单创建失败。" });
  });

  it("returns translated transaction state for status polling", async () => {
    getOrderDetailMock.mockResolvedValueOnce({
      tenant: { brandId: 2, source: "header" },
      summary: {
        orderNo: "RTL-20260419-001",
        status: "pending_payment",
        paymentStatus: "pending",
      },
    });

    const response = await fetch(`${baseUrl}/api/orders/retail/RTL-20260419-001/status?brandId=2`);
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(getOrderDetailMock).toHaveBeenCalledWith({ orderNo: "RTL-20260419-001" });
    expect(payload.transactionState).toBe("pending");
    expect(payload.prompt).toBe("// WAITING FOR PAYMENT CONFIRMATION //");
  });

  it("returns successful transaction envelope for sandbox-settled orders", async () => {
    getOrderDetailMock.mockResolvedValueOnce({
      tenant: { brandId: 2, source: "header" },
      summary: {
        orderNo: "RTL-20260419-002",
        status: "paid",
        paymentStatus: "paid",
      },
    });

    const response = await fetch(`${baseUrl}/api/orders/retail/RTL-20260419-002/status?brandId=2`);
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.transactionState).toBe("successful");
    expect(payload.prompt).toBe("// TRANSACTION SUCCESSFUL //");
  });

  it("returns closed transaction envelope for cancelled retail orders", async () => {
    getOrderDetailMock.mockResolvedValueOnce({
      tenant: { brandId: 2, source: "header" },
      summary: {
        orderNo: "RTL-20260419-003",
        status: "closed",
        paymentStatus: "failed",
      },
    });

    const response = await fetch(`${baseUrl}/api/orders/retail/RTL-20260419-003/status?brandId=2`);
    const payload = (await response.json()) as any;

    expect(response.status).toBe(200);
    expect(payload.transactionState).toBe("closed");
    expect(payload.prompt).toBe("// TRANSACTION CLOSED //");
  });
});
