import { createPublicKey, createSign, generateKeyPairSync } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { normalizePemEnvironmentValue, paymentWebhookCallback } from "./index";

const ORIGINAL_ENV = { ...process.env };

function resetWechatCallbackEnv() {
  process.env = {
    ...ORIGINAL_ENV,
  };

  delete process.env.WECHAT_PAY_API_V3_KEY;
  delete process.env.WECHAT_PAY_PLATFORM_CERT_PEM;
  delete process.env.WECHAT_PAY_PUBLIC_KEY_PEM;
  delete process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM;
  delete process.env.WECHAT_PAY_PLATFORM_CERT_PATH_OR_PUBLIC_KEY;
  delete process.env.WECHAT_PAY_PUBLIC_KEY_ID;
  delete process.env.WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID;
}

function buildSignedWechatCallbackFixture() {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rawBody = JSON.stringify({ event_type: "TRANSACTION.SUCCESS", id: "evt_test" });
  const timestamp = "1710000000";
  const nonce = "nonce-test";
  const serial = "PUB_KEY_ID_09999999999999999999999999999999";
  const signer = createSign("RSA-SHA256");
  signer.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
  signer.end();

  return {
    rawBody,
    serial,
    publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
    headers: {
      "wechatpay-timestamp": timestamp,
      "wechatpay-nonce": nonce,
      "wechatpay-serial": serial,
      "wechatpay-signature": signer.sign(privateKey, "base64"),
    },
  };
}

afterEach(() => {
  resetWechatCallbackEnv();
});

describe("wechat callback verification configuration", () => {
  it("accepts the injected wechat public key pem secret in runtime env", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "api-v3-key";

    const injectedPublicKeyPem = ORIGINAL_ENV.WECHAT_PAY_PUBLIC_KEY_PEM;
    const injectedPublicKeyId = ORIGINAL_ENV.WECHAT_PAY_PUBLIC_KEY_ID;
    expect(injectedPublicKeyPem).toBeTruthy();
    expect(injectedPublicKeyId).toMatch(/^PUB_KEY_ID_/);
    expect(() => createPublicKey(normalizePemEnvironmentValue(injectedPublicKeyPem as string))).not.toThrow();

    process.env.WECHAT_PAY_PUBLIC_KEY_PEM = injectedPublicKeyPem;
    process.env.WECHAT_PAY_PUBLIC_KEY_ID = injectedPublicKeyId;

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: {},
      rawBody: JSON.stringify({ event_type: "TRANSACTION.SUCCESS" }),
    });

    expect(result.stage).toBe("ignored");
    expect(result.responseBody).toBe("invalid_wechatpay_signature");
    expect(result.requiredConfigs).toBeUndefined();
    expect(result.notes.join(" ")).toContain("signature_headers_missing");
  });

  it("accepts platform certificate mode as valid verification material", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "api-v3-key";
    process.env.WECHAT_PAY_PLATFORM_CERT_PEM = "-----BEGIN CERTIFICATE-----\nmock\n-----END CERTIFICATE-----";

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: {},
      rawBody: JSON.stringify({ event_type: "TRANSACTION.SUCCESS" }),
    });

    expect(result.stage).toBe("ignored");
    expect(result.responseBody).toBe("invalid_wechatpay_signature");
    expect(result.notes.join(" ")).toContain("signature_headers_missing");
  });

  it("accepts wechat public key mode when pem and key id are both present", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "api-v3-key";
    process.env.WECHAT_PAY_PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----";
    process.env.WECHAT_PAY_PUBLIC_KEY_ID = "PUB_KEY_ID_01111111111111111111111111111111";

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: {},
      rawBody: JSON.stringify({ event_type: "TRANSACTION.SUCCESS" }),
    });

    expect(result.stage).toBe("ignored");
    expect(result.responseBody).toBe("invalid_wechatpay_signature");
    expect(result.notes.join(" ")).toContain("signature_headers_missing");
  });

  it("surfaces the exact missing public key id when only public key pem is configured", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "api-v3-key";
    process.env.WECHAT_PAY_PUBLIC_KEY_PEM = "-----BEGIN PUBLIC KEY-----\nmock\n-----END PUBLIC KEY-----";

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: {},
      rawBody: JSON.stringify({ event_type: "TRANSACTION.SUCCESS" }),
    });

    expect(result.stage).toBe("ready_for_sdk");
    expect(result.requiredConfigs).toContain("WECHAT_PAY_PUBLIC_KEY_ID");
    expect(result.notes.join(" ")).toContain("成对的微信支付公钥配置");
  });

  it("verifies a signed wechat callback under public key mode", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "api-v3-key";
    const fixture = buildSignedWechatCallbackFixture();
    process.env.WECHAT_PAY_PUBLIC_KEY_PEM = fixture.publicKeyPem;
    process.env.WECHAT_PAY_PUBLIC_KEY_ID = fixture.serial;

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: fixture.headers,
      rawBody: fixture.rawBody,
    });

    expect(result.stage).toBe("verified");
    expect(result.verified).toBe(true);
    expect(result.responseStatus).toBe(200);
    expect(result.responseBody).toContain("SUCCESS");
    expect(result.notes.join(" ")).toContain("已通过微信 callback 签名验证");
  });
});
