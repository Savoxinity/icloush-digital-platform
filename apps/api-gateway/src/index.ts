import "dotenv/config";
import express from "express";
import type { Request } from "express";
import { TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext, createRestContext } from "./gateway";

function normalizeRequestedBrandId(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (raw === null || typeof raw === "undefined") {
    return null;
  }

  const normalized = String(raw).trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `非法 brandId：${normalized}`,
    });
  }

  return String(parsed);
}

function enforceRouteBrandId(req: Request, routeBrandId: unknown) {
  const headerBrandId = normalizeRequestedBrandId(
    req.headers["x-brand-id"] ?? req.headers["brand_id"] ?? req.headers["brand-id"],
  );
  const normalizedRouteBrandId = normalizeRequestedBrandId(routeBrandId);

  if (!headerBrandId && !normalizedRouteBrandId) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "缺少 brandId。请在请求头 `x-brand-id` 或当前路由参数中显式提供 brandId。",
    });
  }

  if (headerBrandId && normalizedRouteBrandId && headerBrandId !== normalizedRouteBrandId) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `brandId 不一致：header=${headerBrandId}，route=${normalizedRouteBrandId}`,
    });
  }

  req.headers["x-brand-id"] = headerBrandId ?? normalizedRouteBrandId ?? "";
}


export const app = express();
const port = Number(process.env.API_GATEWAY_PORT ?? process.env.PORT ?? 3010);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "api-gateway",
    timestamp: Date.now(),
  });
});

app.post("/api/orders/retail", async (req, res) => {
  try {
    enforceRouteBrandId(req, req.body?.brandId);

    const caller = appRouter.createCaller(await createRestContext(req, res));
    const gateway = req.body?.gateway === "alipay_openapi" ? "alipay_openapi" : "wechat_pay_v3";
    const result = await caller.orders.create({
      userId: Number(req.body?.userId),
      customerType: "b2c",
      note: typeof req.body?.note === "string" ? req.body.note : undefined,
      items: Array.isArray(req.body?.items) ? req.body.items : [],
      payment: {
        provider: gateway === "alipay_openapi" ? "alipay" : "wechat_jsapi",
        paymentScenario: "full_payment",
        payerOpenId: typeof req.body?.payerOpenId === "string" ? req.body.payerOpenId : undefined,
        allowCreditCard: false,
      },
      sandbox: {
        autoSettle: true,
        delayMs: 6000,
        outcome: "successful",
      },
    });

    res.status(201).json({
      ok: true,
      tenant: result.tenant,
      order: {
        id: result.order.id,
        orderNo: result.order.orderNo,
        status: result.order.status,
        paymentStatus: result.order.paymentStatus,
        amount: result.order.payableAmount,
        currency: result.order.currency,
      },
      payment: result.payment,
      paymentParameters: {
        gateway,
        wechatPay: gateway === "wechat_pay_v3" ? result.paymentIntent : null,
        alipay: gateway === "alipay_openapi" ? result.paymentIntent : null,
      },
    });
  } catch (error) {
    const status =
      error instanceof TRPCError
        ? error.code === "BAD_REQUEST"
          ? 400
          : error.code === "NOT_FOUND"
            ? 404
            : error.code === "FORBIDDEN"
              ? 403
              : 500
        : 500;
    const message = error instanceof Error ? error.message : "零售订单创建失败。";
    res.status(status).json({ ok: false, message });
  }
});

app.get("/api/orders/retail/:orderNo/status", async (req, res) => {
  try {
    enforceRouteBrandId(req, req.query?.brandId);

    const caller = appRouter.createCaller(await createRestContext(req, res));
    const result = await caller.orders.detail({ orderNo: String(req.params.orderNo) });
    const transactionState =
      result.summary.paymentStatus === "paid"
        ? "successful"
        : result.summary.status === "cancelled" || result.summary.status === "closed"
          ? "closed"
          : "pending";

    res.json({
      ok: true,
      tenant: result.tenant,
      orderNo: result.summary.orderNo,
      status: result.summary.status,
      paymentStatus: result.summary.paymentStatus,
      transactionState,
      prompt:
        transactionState === "successful"
          ? "// TRANSACTION SUCCESSFUL //"
          : transactionState === "closed"
            ? "// TRANSACTION CLOSED //"
            : "// WAITING FOR PAYMENT CONFIRMATION //",
    });
  } catch (error) {
    const status =
      error instanceof TRPCError
        ? error.code === "BAD_REQUEST"
          ? 400
          : error.code === "NOT_FOUND"
            ? 404
            : error.code === "FORBIDDEN"
              ? 403
              : 500
        : 500;
    const message = error instanceof Error ? error.message : "零售订单状态查询失败。";
    res.status(status).json({ ok: false, message });
  }
});

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  }),
);

if (!process.env.VITEST) {
  app.listen(port, () => {
    console.log(`[api-gateway] Server running on http://localhost:${port}`);
  });
}
