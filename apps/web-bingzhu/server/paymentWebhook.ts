import express, { type Express, type Request } from "express";

import { recordGatewayPaymentCallback } from "../../../packages/oms/src/index";
import { paymentWebhookCallback, type PaymentGateway } from "../../../packages/payments/src/index";
import { getDb } from "./db";

const supportedGateways = new Set<PaymentGateway>(["wechat_pay_v3", "alipay_openapi"]);

function isPaymentGateway(value: string): value is PaymentGateway {
  return supportedGateways.has(value as PaymentGateway);
}

function normalizeHeaders(headers: Request["headers"]) {
  const normalized: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (typeof value === "undefined") {
      normalized[key] = undefined;
    } else if (Array.isArray(value)) {
      normalized[key] = value;
    } else {
      normalized[key] = String(value);
    }
  }
  return normalized;
}

function normalizeQuery(query: Request["query"]) {
  const normalized: Record<string, string | string[] | undefined> = {};
  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "undefined") {
      normalized[key] = undefined;
    } else if (Array.isArray(value)) {
      normalized[key] = value.map((entry) => String(entry));
    } else {
      normalized[key] = String(value);
    }
  }
  return normalized;
}

function readRawBody(body: unknown) {
  if (typeof body === "string") {
    return body;
  }
  if (Buffer.isBuffer(body)) {
    return body.toString("utf8");
  }
  if (body && typeof body === "object") {
    return JSON.stringify(body);
  }
  return "";
}

export function registerPaymentWebhookRoutes(app: Express) {
  app.post("/api/payments/:gateway/callback", express.raw({ type: "*/*", limit: "2mb" }), async (req, res) => {
    const gatewayParam = typeof req.params.gateway === "string" ? req.params.gateway.trim() : "";
    if (!isPaymentGateway(gatewayParam)) {
      res.status(404).send("unsupported_payment_gateway");
      return;
    }

    const gateway = gatewayParam;
    const rawBody = readRawBody(req.body);
    const callback = await paymentWebhookCallback({
      gateway,
      headers: normalizeHeaders(req.headers),
      rawBody,
      query: normalizeQuery(req.query),
    });

    try {
      const db = await getDb();
      if (db && callback.orderNo) {
        await recordGatewayPaymentCallback({
          db,
          gateway,
          orderNo: callback.orderNo,
          eventType: callback.eventType,
          providerOrderId: callback.providerOrderId,
          amount: callback.amount,
          rawBody,
          headers: normalizeHeaders(req.headers),
          verified: callback.verified,
          signatureStatus: callback.verified ? "verified" : callback.stage === "ready_for_sdk" ? "pending" : "failed",
          stage: callback.stage,
          responseStatus: callback.responseStatus,
          notes: callback.notes,
        });
      }
    } catch (error) {
      console.warn("[PaymentWebhook] Failed to persist callback log:", error);
    }

    res.status(callback.responseStatus).type("text/plain").send(callback.responseBody);
  });
}
