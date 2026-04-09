import { describe, expect, it } from "vitest";
import {
  buildWechatPaymentDraft,
  extractRequestedBrandId,
  normalizeHost,
  resolveTierPrice,
} from "../src/gateway";

describe("api-gateway helpers", () => {
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

  it("builds wechat draft with credit-card and installment capability metadata", () => {
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
    expect(draft.capabilities).toEqual({ supportsCreditCard: true, supportsInstallment: true });
    expect(draft.metadata).toMatchObject({
      brandId: 1,
      orderId: 18,
      paymentScenario: "installment",
      installmentPlanCode: "CMB-12M",
      payerOpenId: "wx-open-id",
    });
  });
});
