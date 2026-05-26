import express from "express";
import { createServer } from "http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as dbModule from "./db";
import * as omsModule from "../../../packages/oms/src/index";
import * as paymentsModule from "../../../packages/payments/src/index";
import { registerPaymentWebhookRoutes } from "./paymentWebhook";

const activeServers = new Set<ReturnType<typeof createServer>>();

async function startWebhookTestServer() {
  const app = express();
  registerPaymentWebhookRoutes(app);
  const server = createServer(app);
  activeServers.add(server);

  await new Promise<void>((resolve) => {
    server.listen(0, () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("测试服务未能获取端口。");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(async () => {
  await Promise.all(
    Array.from(activeServers).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    ),
  );
  activeServers.clear();
});

describe("registerPaymentWebhookRoutes", () => {
  it("accepts wechat callback and forwards raw body into callback parser + OMS log helper", async () => {
    vi.spyOn(dbModule, "getDb").mockResolvedValue({ marker: "db" } as never);
    const callbackSpy = vi.spyOn(paymentsModule, "paymentWebhookCallback").mockResolvedValue({
      gateway: "wechat_pay_v3",
      stage: "processing",
      verified: false,
      eventType: "TRANSACTION.SUCCESS",
      providerOrderId: "4200000000001",
      orderNo: "ORD-WEBHOOK-001",
      amount: 19900,
      responseStatus: 202,
      responseBody: "callback_received_pending_verification",
      notes: ["production_live 回调已受理"],
    });
    const recordSpy = vi.spyOn(omsModule, "recordGatewayPaymentCallback").mockResolvedValue({
      accepted: true,
      matched: true,
      shouldMarkPaid: false,
      orderId: 1,
      paymentId: 2,
      orderNo: "ORD-WEBHOOK-001",
      processStatus: "received",
      notes: [],
    } as never);

    const { baseUrl } = await startWebhookTestServer();
    const rawBody = JSON.stringify({
      id: "evt-001",
      event_type: "TRANSACTION.SUCCESS",
      out_trade_no: "ORD-WEBHOOK-001",
      transaction_id: "4200000000001",
      amount: { total: 19900 },
    });

    const response = await fetch(`${baseUrl}/api/payments/wechat_pay_v3/callback?source=wechat`, {
      method: "POST",
        headers: {
          "content-type": "application/json",
          "wechatpay-signature": "stub-signature",
        },

      body: rawBody,
    });

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("callback_received_pending_verification");
    expect(callbackSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: "wechat_pay_v3",
        rawBody,
        query: expect.objectContaining({ source: "wechat" }),
      }),
    );
    expect(recordSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        gateway: "wechat_pay_v3",
        orderNo: "ORD-WEBHOOK-001",
        providerOrderId: "4200000000001",
        rawBody,
      }),
    );
  });

  it("returns 404 for unsupported payment gateway callback", async () => {
    const { baseUrl } = await startWebhookTestServer();

    const response = await fetch(`${baseUrl}/api/payments/unknown_gateway/callback`, {
      method: "POST",
      body: "{}",
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("unsupported_payment_gateway");
  });
});
