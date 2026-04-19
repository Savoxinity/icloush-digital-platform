import "dotenv/config";
import express from "express";
import { TRPCError } from "@trpc/server";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter, createContext, createRestContext } from "./gateway";

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
    if (!req.headers["x-brand-id"] && typeof req.body?.brandId !== "undefined") {
      req.headers["x-brand-id"] = String(req.body.brandId);
    }

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
    if (!req.headers["x-brand-id"] && typeof req.query?.brandId !== "undefined") {
      req.headers["x-brand-id"] = String(req.query.brandId);
    }

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
