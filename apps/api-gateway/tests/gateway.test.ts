import { TRPCError } from "@trpc/server";
import {
  appRouter,
  extractRequestedBrandId,
  normalizeHost,
} from "../src/gateway";
import { assertOrderStatusTransition } from "../../../packages/oms/src/index";
import { buildWechatPaymentDraft, getPaymentApiInventory } from "../../../packages/payments/src/index";
import { resolveTierPrice } from "../../../packages/pim/src/index";

describe("api-gateway helper integration", () => {
  it("prefers explicit brand id from headers", () => {
    expect(extractRequestedBrandId({ "x-brand-id": "2" })).toBe(2);
    expect(extractRequestedBrandId({ brand_id: "3" })).toBe(3);
    expect(extractRequestedBrandId({ "x-tenant-id": "abc" })).toBeNull();
  });

  it("normalizes forwarded host", () => {
    expect(normalizeHost("https://Lab.iCloush.com:443")).toBe("lab.icloush.com");
    expect(normalizeHost("portal.icloush.cn, proxy.internal")).toBe("portal.icloush.cn");
    expect(normalizeHost(undefined)).toBeNull();
  });

  it("blocks protected routes when tenant context is missing", async () => {
    const caller = appRouter.createCaller({
      db: null,
      tenant: null,
      req: {} as never,
      res: {} as never,
    });

    await expect(caller.tenant.resolve()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "缺少租户上下文。请在请求头传入 x-brand-id / brand_id，或通过已绑定域名访问。",
    });

    await expect(caller.payments.apiInventory()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "缺少租户上下文。请在请求头传入 x-brand-id / brand_id，或通过已绑定域名访问。",
    });
  });

  it("resolves B2B tier price by quantity", () => {
    const result = resolveTierPrice({
      basePrice: 1200,
      quantity: 12,
      customerType: "b2b",
      tierPrices: [
        { minQty: 1, maxQty: 9, price: 1100, customerType: "b2b" },
        { minQty: 10, maxQty: 49, price: 980, customerType: "b2b" },
        { minQty: 50, maxQty: null, price: 900, customerType: "b2b" },
      ],
    });

    expect(result.unitPrice).toBe(980);
    expect(result.matchedTier).toMatchObject({ minQty: 10, maxQty: 49, price: 980 });
  });

  it("falls back to base price when no tier matches current customer type", () => {
    const result = resolveTierPrice({
      basePrice: 1500,
      quantity: 3,
      customerType: "b2c",
      tierPrices: [{ minQty: 5, maxQty: null, price: 1300, customerType: "b2b" }],
    });

    expect(result.unitPrice).toBe(1500);
    expect(result.matchedTier).toBeNull();
  });

  it("builds wechat draft with installment metadata and required API checklist", () => {
    const draft = buildWechatPaymentDraft({
      brandId: 1,
      orderId: 18,
      orderNo: "ORD-1-DEMO",
      amount: 880000,
      openId: "wx-open-id",
      paymentScenario: "installment",
      installmentPlanCode: "CMB-12M",
    });

    expect(draft.provider).toBe("wechat_jsapi");
    expect(draft.integrationMode).toBe("stubbed");
    expect(draft.capabilities).toEqual({ supportsCreditCard: true, supportsInstallment: true });
    expect(draft.requiredApis.some((item) => item.endpoint === "/v3/pay/transactions/jsapi")).toBe(true);
    expect(draft.metadata).toMatchObject({
      brandId: 1,
      orderId: 18,
      paymentScenario: "installment",
      installmentPlanCode: "CMB-12M",
      payerOpenId: "wx-open-id",
    });
  });

  it("exposes both wechat and alipay API inventories", () => {
    const inventory = getPaymentApiInventory();

    expect(inventory.some((item) => item.provider === "wechat_pay" && item.phase === "create")).toBe(true);
    expect(inventory.some((item) => item.provider === "alipay" && item.phase === "callback")).toBe(true);
  });

  it("allows bank transfer review to move from pending payment to under review", () => {
    expect(() => assertOrderStatusTransition("pending_payment", "under_review")).not.toThrow();
  });

  it("rejects illegal order status transitions", () => {
    expect(() => assertOrderStatusTransition("completed", "paid")).toThrow(TRPCError);
  });
});
