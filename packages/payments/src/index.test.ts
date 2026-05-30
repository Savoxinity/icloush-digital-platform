import { createCipheriv, createPublicKey, createSign, generateKeyPairSync, randomBytes } from "node:crypto";
import * as https from "node:https";
import { PassThrough } from "node:stream";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createPaymentOrder, normalizePemEnvironmentValue, paymentWebhookCallback, setWechatHttpRequestForTest, verifyWechatCallbackSignature } from "./index";

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
  delete process.env.WECHAT_PAY_MCHID;
  delete process.env.WECHAT_PAY_APPID;
  delete process.env.WECHAT_PAY_CERT_SERIAL_NO;
  delete process.env.WECHAT_PAY_SERIAL_NO;
  delete process.env.WECHAT_PAY_PRIVATE_KEY_PEM;
  delete process.env.WECHAT_PAY_PRIVATE_KEY;
}

function mockWechatCreateOrderResponse(options: {
  status: number;
  body: string;
  assertRequest?: (args: { requestOptions: Record<string, unknown>; body: string }) => void;
}) {
  const requestMock = vi.fn(((requestOptions: Record<string, unknown>, callback: (res: PassThrough & { statusCode?: number; headers?: Record<string, string> }) => void) => {
    let body = "";
    const req = {
      on: vi.fn().mockReturnThis(),
      write: vi.fn((chunk: string | Buffer) => {
        body += chunk.toString();
      }),
      end: vi.fn(() => {
        options.assertRequest?.({ requestOptions, body });
        const res = new PassThrough() as PassThrough & { statusCode?: number; headers?: Record<string, string> };
        res.statusCode = options.status;
        res.headers = {};
        callback(res);
        res.end(options.body);
      }),
    };

    return req as unknown as ReturnType<typeof https.request>;
  }) as typeof https.request);

  setWechatHttpRequestForTest(requestMock as unknown as typeof https.request);
  return requestMock;
}

function buildSignedWechatCallbackFixture(options?: {
  rawBody?: string;
  serial?: string;
  signingKeyPem?: string;
  publicKeyPem?: string;
}) {
  const generatedKeyPair = options?.signingKeyPem
    ? null
    : generateKeyPairSync("rsa", { modulusLength: 2048 });
  const rawBody = options?.rawBody ?? JSON.stringify({ event_type: "TRANSACTION.SUCCESS", id: "evt_test" });
  const timestamp = "1710000000";
  const nonce = "nonce-test";
  const serial = options?.serial ?? "PUB_KEY_ID_09999999999999999999999999999999";
  const signer = createSign("RSA-SHA256");
  signer.update(`${timestamp}\n${nonce}\n${rawBody}\n`);
  signer.end();
  const signingKeyPem = options?.signingKeyPem ?? generatedKeyPair?.privateKey.export({ type: "pkcs8", format: "pem" }).toString();
  const publicKeyPem = options?.publicKeyPem ?? generatedKeyPair?.publicKey.export({ type: "spki", format: "pem" }).toString();

  return {
    rawBody,
    serial,
    publicKeyPem: publicKeyPem ?? "",
    headers: {
      "wechatpay-timestamp": timestamp,
      "wechatpay-nonce": nonce,
      "wechatpay-serial": serial,
      "wechatpay-signature": signer.sign(signingKeyPem!, "base64"),
    },
  };
}

const PLATFORM_CERT_TEST_SERIAL = "7698B16965660B6DD8E67F8090A138DF1338CF87";
const PLATFORM_CERT_TEST_PEM = `-----BEGIN CERTIFICATE-----
MIIDHzCCAgegAwIBAgIUdpixaWVmC23Y5n+AkKE43xM4z4cwDQYJKoZIhvcNAQEL
BQAwHzEdMBsGA1UEAwwUd2VjaGF0LXBsYXRmb3JtLXRlc3QwHhcNMjYwNTMwMTIz
NzQyWhcNMjYwNTMxMTIzNzQyWjAfMR0wGwYDVQQDDBR3ZWNoYXQtcGxhdGZvcm0t
dGVzdDCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBAKRmcAxp4VxgP2rs
pxv3NKfLpw6Hv9AveN0jOhxNUeVH1BOw+85cpdMy3jUuJH3Z6/EtbdMl7ajjQ01c
cA/JPrNX0zTRzSxDD/3VDG4K76tjO+Bxy7WRKmvz+b8UxlJ6Clwdc5cdZIkT8Kvm
9fgX72OKhJmja1XPakKA4qLbmp+QT38VEsu/toxm/GB+YeLMgTxMD/I29v+thY2f
4d2rQ1yMmuyjL6hnRLZ0CtRNmgOEh+L95QINhPBoSKTgh43rTy0cvSQoaDmGZxit
QvB3aDXlWP9Px2jkPPazKMTHkcaPWC401AFzFazsXhSGSI74LAPbYbxckOPz/QL8
vtjd160CAwEAAaNTMFEwHQYDVR0OBBYEFKa+ifS4aQQxvE6Gh6l/CiXvldayMB8G
A1UdIwQYMBaAFKa+ifS4aQQxvE6Gh6l/CiXvldayMA8GA1UdEwEB/wQFMAMBAf8w
DQYJKoZIhvcNAQELBQADggEBAFm2ZPYjceI73MZu1g9ejcrDioe2OktCk21Ur20A
TtSntsMSAx5uX8PKoXh1U4OLgoDifx+hX990/cKyQFKkkRXVaET17VNLvj0+g/8j
ZNL9+6Cguuu+fmXMFNXHmb70A+jZqnHz9wFEs4aNQw8nVqNzpD1zSIAkcNjsLuW9
3LKD3FlunfrrlsdIIGGXPfmo17bm7N7fFak7lX/5IiNMxB85Uih3zWCXnViGSBFf
eNOhGbOKw8qENAlpVjAKgrKVtMRu5Sq2xsJPg91cmY3aOnV89UxVf3firYQZgnsa
LIPtjF3JUorqeQQw2ty3D6sq+F/q68zPAaDtJCpN9fjt9KU=
-----END CERTIFICATE-----`;
const PLATFORM_CERT_TEST_PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCkZnAMaeFcYD9q
7Kcb9zSny6cOh7/QL3jdIzocTVHlR9QTsPvOXKXTMt41LiR92evxLW3TJe2o40NN
XHAPyT6zV9M00c0sQw/91QxuCu+rYzvgccu1kSpr8/m/FMZSegpcHXOXHWSJE/Cr
5vX4F+9jioSZo2tVz2pCgOKi25qfkE9/FRLLv7aMZvxgfmHizIE8TA/yNvb/rYWN
n+Hdq0NcjJrsoy+oZ0S2dArUTZoDhIfi/eUCDYTwaEik4IeN608tHL0kKGg5hmcY
rULwd2g15Vj/T8do5Dz2syjEx5HGj1guNNQBcxWs7F4UhkiO+CwD22G8XJDj8/0C
/L7Y3detAgMBAAECggEAC5EVgxoT/A7dh2VdII+VCdU/TLtqWHhulYh79y/NekdC
eZwzK0LDfAeRMMatVJl3i0F5/6gkf4R14MSHMeUj3zRnrMiyGdIiFubdeASW9kUG
GnWHMqAjDvNceAA7L+RcRDziPBiaUTaw8TdPyQPOGP/O8oxX6fKs9D7jMzgmOeGt
h/V2bu9qvv23vzGhDsRhvZUa2SD/fLpASrMgPEy/ErLJJLw6KRSipDcqkZRD0Sua
0PoTqV+AlCenw4GR6JqQJ+PB18Q2aJn6Za7GVpE4bzDY57/js5I8Q1Grcnz/SK+r
QGm8eFOKwXiuHZqBnqEKHA4/9/GqRfGQAzgugplY9QKBgQDMkdto5UNxVhW8HYcR
N1r1J1eIysRhd21vsi5X1ROo9Pka/wpGo52I/mBfQA2BshTp5564w3bUNhBukB8h
/w3oT9MFGs6/ZFtumnqi3cSx5xUnj+bhPf2lvgA8LGXTwWRPgP7G4Th4U6IpN3cQ
Nz+QyKo0CQr54RGyCmvfyWTNxwKBgQDNu0IUspVFlAImgWePt76Ud58rs11z2OEI
+ru3evaTfti9v3CqGR6VFfiIgUWf+78Ct6TeqK1YTfTPTSUH8VSBGZY9Tz8AHpk7
d9vnHm/sFVXEeRTfiQJ4fQwLu5ypN83uaU/DZIRlN8mXSJ8dL6ev/X11+dlEa4wS
2lpBV4t+6wKBgC85aJYxfr02KzRO+LQvvC6l014/uM/rOvczAeHCzZQOYUcrIxsl
gCN03Zh/d9691ngcwRZUASWCCY8MdDNr5rD/ZG5kPuAN8dF5ld/tJBARkV+dp6XN
orVVREaf1S3qEhcMZ0RQD7IvVFsBc9npdyIcQLZcdA01ONmJ8Fcr7bpXAoGBAJwf
jSgz1b+1cGRUM4kHAaOdm7cIKNUvMqcjz6yPreuEiWqFizQqV+D/iVnd8D5WR0AC
qSUnkFTA5BUlEAMVCvHlvvPL3Z1zmwlcDg84M+tOzYWJ9WMlkDBrhOaqe1qXNLnG
RXecIjTFv0AFJmp5raGKltkev9iCXQw5k+CeVQf9AoGAFs8ES2mDCx3N0Jg5F7Km
PiQ4A9WMDDQC/YyRku6PmoicjaWOCQ/RFTcDnC1rMq95ZoPbdh7jhJU6S4tvAPC6
g/DUk1dHhXtbhb/Ei8zlqXk5YNSfLqNfzMVsRiwK76HwTwjUaCn0K4KHSONkFIJT
UsUapj+liDAsSnw3YJ/2+CA=
-----END PRIVATE KEY-----`;

function buildEncryptedWechatResource(apiV3Key: string) {
  const nonce = randomBytes(12).toString("base64").slice(0, 12);
  const associatedData = "transaction";
  const plaintext = JSON.stringify({
    out_trade_no: "ORDER-1001",
    transaction_id: "4200000000000000001",
    amount: { total: 18800 },
  });
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(apiV3Key, "utf8"), Buffer.from(nonce, "utf8"));
  cipher.setAAD(Buffer.from(associatedData, "utf8"));
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    rawBody: JSON.stringify({
      id: "evt_with_resource",
      event_type: "TRANSACTION.SUCCESS",
      resource_type: "encrypt-resource",
      resource: {
        algorithm: "AEAD_AES_256_GCM",
        nonce,
        associated_data: associatedData,
        ciphertext: Buffer.concat([encrypted, authTag]).toString("base64"),
      },
    }),
    expected: JSON.parse(plaintext),
  };
}

afterEach(() => {
  resetWechatCallbackEnv();
  setWechatHttpRequestForTest(null);
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
    process.env.WECHAT_PAY_PLATFORM_CERT_PEM = PLATFORM_CERT_TEST_PEM;

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

  it("decrypts encrypted wechat callback resource after signature verification", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "12345678901234567890123456789012";
    const encryptedResource = buildEncryptedWechatResource(process.env.WECHAT_PAY_API_V3_KEY);
    const fixture = buildSignedWechatCallbackFixture({ rawBody: encryptedResource.rawBody });
    process.env.WECHAT_PAY_PUBLIC_KEY_PEM = fixture.publicKeyPem;
    process.env.WECHAT_PAY_PUBLIC_KEY_ID = fixture.serial;

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: fixture.headers,
      rawBody: fixture.rawBody,
    });

    expect(result.stage).toBe("verified");
    expect(result.verified).toBe(true);
    expect(result.orderNo).toBe(encryptedResource.expected.out_trade_no);
    expect(result.providerOrderId).toBe(encryptedResource.expected.transaction_id);
    expect(result.amount).toBe(encryptedResource.expected.amount.total);
    expect(result.notes.join(" ")).toContain("已完成 resource 解密并提取交易字段");
  });

  it("verifies a signed wechat callback under platform certificate mode when serial matches", () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_PLATFORM_CERT_PEM = PLATFORM_CERT_TEST_PEM;
    const fixture = buildSignedWechatCallbackFixture({
      rawBody: JSON.stringify({ event_type: "TRANSACTION.SUCCESS", id: "evt_platform_cert" }),
      serial: PLATFORM_CERT_TEST_SERIAL,
      signingKeyPem: PLATFORM_CERT_TEST_PRIVATE_KEY,
    });

    const result = verifyWechatCallbackSignature({
      gateway: "wechat_pay_v3",
      headers: fixture.headers,
      rawBody: fixture.rawBody,
    });

    expect(result).toEqual({ ok: true, mode: "platform_cert", reason: "verified" });
  });

  it("rejects platform certificate mode when wechatpay serial does not match certificate serial", () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_PLATFORM_CERT_PEM = PLATFORM_CERT_TEST_PEM;
    const fixture = buildSignedWechatCallbackFixture({
      rawBody: JSON.stringify({ event_type: "TRANSACTION.SUCCESS", id: "evt_platform_cert_serial_mismatch" }),
      serial: "7698B16965660B6DD8E67F8090A138DF1338CF88",
      signingKeyPem: PLATFORM_CERT_TEST_PRIVATE_KEY,
    });

    const result = verifyWechatCallbackSignature({
      gateway: "wechat_pay_v3",
      headers: fixture.headers,
      rawBody: fixture.rawBody,
    });

    expect(result).toEqual({ ok: false, mode: "platform_cert", reason: "wechatpay_serial_mismatch" });
  });

  it("fails closed when platform certificate pem is invalid", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_API_V3_KEY = "12345678901234567890123456789012";
    process.env.WECHAT_PAY_PLATFORM_CERT_PEM = "not-a-valid-cert";
    const fixture = buildSignedWechatCallbackFixture();

    const result = await paymentWebhookCallback({
      gateway: "wechat_pay_v3",
      headers: fixture.headers,
      rawBody: fixture.rawBody,
    });

    expect(result.stage).toBe("ready_for_sdk");
    expect(result.verified).toBe(false);
    expect(result.requiredConfigs).toContain("WECHAT_PAY_PLATFORM_CERT_PEM or (WECHAT_PAY_PUBLIC_KEY_PEM + WECHAT_PAY_PUBLIC_KEY_ID)");
  });
});

describe("wechat jsapi create order", () => {
  it("returns explicit payerOpenId diagnosis before live jsapi call", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_MCHID = "1738743259";
    process.env.WECHAT_PAY_APPID = "wx-test-appid";
    process.env.WECHAT_PAY_CERT_SERIAL_NO = "SERIAL_TEST_001";
    process.env.WECHAT_PAY_PRIVATE_KEY_PEM = PLATFORM_CERT_TEST_PRIVATE_KEY;

    const result = await createPaymentOrder({
      gateway: "wechat_pay_v3",
      brandId: 1,
      orderId: 2,
      orderNo: "ORDER-OPENID-MISSING",
      amount: 18800,
      currency: "CNY",
      description: "Retail order",
      notifyUrl: "https://example.com/pay/callback",
      returnUrl: "https://example.com/orders/1",
      metadata: { paymentMode: "production_live" },
    });

    expect(result.stage).toBe("ready_for_sdk");
    expect(result.requiredConfigs).toContain("WECHAT_PAYER_OPENID");
    expect(result.clientPayload?.missingPayerOpenId).toBe(true);
    expect(result.notes.join(" ")).toContain("payerOpenId");
  });

  it("creates a live jsapi order and returns prepay invoke payload", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_MCHID = "1738743259";
    process.env.WECHAT_PAY_APPID = "wx-test-appid";
    process.env.WECHAT_PAY_CERT_SERIAL_NO = "SERIAL_TEST_002";
    process.env.WECHAT_PAY_PRIVATE_KEY_PEM = PLATFORM_CERT_TEST_PRIVATE_KEY;

    const requestSpy = mockWechatCreateOrderResponse({
      status: 200,
      body: JSON.stringify({ prepay_id: "wx201410272009395522657a690389285100" }),
      assertRequest: ({ requestOptions, body }) => {
        expect(requestOptions.path).toBe("/v3/pay/transactions/jsapi");
        expect(requestOptions.method).toBe("POST");
        expect(requestOptions.hostname).toBe("api.mch.weixin.qq.com");
        expect((requestOptions.headers as Record<string, string>).Authorization).toContain("WECHATPAY2-SHA256-RSA2048");
        expect(JSON.parse(body)).toMatchObject({
          appid: "wx-test-appid",
          mchid: "1738743259",
          out_trade_no: "ORDER-LIVE-001",
          payer: { openid: "user-openid-001" },
        });
      },
    });

    const result = await createPaymentOrder({
      gateway: "wechat_pay_v3",
      brandId: 1,
      orderId: 2,
      orderNo: "ORDER-LIVE-001",
      amount: 18800,
      currency: "CNY",
      description: "Retail order",
      notifyUrl: "https://example.com/pay/callback",
      returnUrl: "https://example.com/orders/1",
      payer: { openId: "user-openid-001" },
      metadata: { paymentMode: "production_live" },
    });

    expect(result.stage).toBe("processing");
    expect(result.providerOrderId).toBe("wx201410272009395522657a690389285100");
    expect(result.clientPayload).toMatchObject({
      integration: "wechat_pay_v3_live",
      appId: "wx-test-appid",
      mchId: "1738743259",
      prepayId: "wx201410272009395522657a690389285100",
      package: "prepay_id=wx201410272009395522657a690389285100",
      signType: "RSA",
    });
    expect(typeof result.clientPayload?.paySign).toBe("string");
    expect(requestSpy).toHaveBeenCalledTimes(1);
  });

  it("surfaces upstream jsapi error response as diagnosable ready_for_sdk output", async () => {
    resetWechatCallbackEnv();
    process.env.WECHAT_PAY_MCHID = "1738743259";
    process.env.WECHAT_PAY_APPID = "wx-test-appid";
    process.env.WECHAT_PAY_CERT_SERIAL_NO = "SERIAL_TEST_003";
    process.env.WECHAT_PAY_PRIVATE_KEY_PEM = PLATFORM_CERT_TEST_PRIVATE_KEY;

    mockWechatCreateOrderResponse({
      status: 401,
      body: JSON.stringify({ code: "PARAM_ERROR", message: "payer openid invalid" }),
    });

    const result = await createPaymentOrder({
      gateway: "wechat_pay_v3",
      brandId: 1,
      orderId: 2,
      orderNo: "ORDER-LIVE-ERR-001",
      amount: 18800,
      currency: "CNY",
      description: "Retail order",
      notifyUrl: "https://example.com/pay/callback",
      returnUrl: "https://example.com/orders/1",
      payer: { openId: "user-openid-err" },
      metadata: { paymentMode: "production_live" },
    });

    expect(result.stage).toBe("ready_for_sdk");
    expect(result.clientPayload).toMatchObject({
      integration: "wechat_pay_v3_live_error",
      httpStatus: 401,
      errorCode: "PARAM_ERROR",
      errorMessage: "payer openid invalid",
    });
    expect(result.notes.join(" ")).toContain("PARAM_ERROR");
  });
});
