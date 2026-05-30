import { X509Certificate, createDecipheriv, createPublicKey, createSign, createVerify, randomUUID } from "node:crypto";
import * as https from "node:https";
import { TRPCError } from "@trpc/server";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bankTransferReceipts, orders, payments } from "../../database/schema";

export type DatabaseClient = ReturnType<typeof drizzle>;
export type PaymentProvider = "wechat_jsapi" | "offline_bank_transfer" | "alipay";
export type PaymentScenario = "full_payment" | "installment" | "credit_card" | "deposit" | "offline_review";
export type PaymentGateway = "wechat_pay_v3" | "alipay_openapi";
export type PaymentGatewayStage = "pending_configuration" | "ready_for_sdk" | "processing" | "verified" | "ignored";

export type PaymentApiInventoryItem = {
  provider: "wechat_pay" | "alipay";
  capability: string;
  phase: "auth" | "create" | "callback" | "query" | "refund" | "transfer";
  method: string;
  endpoint: string;
  required: boolean;
  purpose: string;
  notes: string;
};

export type PaymentGatewayCreateOrderInput = {
  gateway: PaymentGateway;
  brandId: number;
  orderId: number;
  orderNo: string;
  amount: number;
  currency: string;
  description: string;
  payer?: {
    openId?: string | null;
    buyerId?: string | null;
  };
  notifyUrl: string;
  returnUrl?: string | null;
  metadata?: Record<string, unknown>;
};

export type PaymentGatewayCreateOrderResult = {
  gateway: PaymentGateway;
  stage: PaymentGatewayStage;
  providerOrderId: string | null;
  clientPayload: Record<string, unknown> | null;
  requiredConfigs: string[];
  requestSnapshot: Record<string, unknown>;
  notes: string[];
};

export type PaymentWebhookCallbackInput = {
  gateway: PaymentGateway;
  headers: Record<string, string | string[] | undefined>;
  rawBody: string;
  query?: Record<string, string | string[] | undefined>;
};

export type PaymentWebhookCallbackResult = {
  gateway: PaymentGateway;
  stage: PaymentGatewayStage;
  verified: boolean;
  eventType: string | null;
  providerOrderId: string | null;
  orderNo: string | null;
  amount: number | null;
  responseStatus: number;
  responseBody: string;
  requiredConfigs?: string[];
  notes: string[];
};

export type PaymentGatewayInterface = {
  gateway: PaymentGateway;
  createPaymentOrder: (input: PaymentGatewayCreateOrderInput) => Promise<PaymentGatewayCreateOrderResult>;
  paymentWebhookCallback: (input: PaymentWebhookCallbackInput) => Promise<PaymentWebhookCallbackResult>;
};

const buildPaymentNo = (brandId: number) =>
  `PAY-${brandId}-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`;

const normalizeMetaJson = (value: unknown): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const extractFileKeyFromUrl = (url: string): string | null => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.pathname.replace(/^\/+/, "") || null;
  } catch {
    return null;
  }
};

export const PAYMENT_API_INVENTORY: PaymentApiInventoryItem[] = [
  {
    provider: "wechat_pay",
    capability: "JSAPI 下单",
    phase: "create",
    method: "POST",
    endpoint: "/v3/pay/transactions/jsapi",
    required: true,
    purpose: "创建微信 JSAPI 预支付交易单，返回 prepay_id。",
    notes: "用于小程序或公众号收银，前端需二次签名后调起支付。",
  },
  {
    provider: "wechat_pay",
    capability: "支付结果通知",
    phase: "callback",
    method: "POST",
    endpoint: "商户自定义 notify_url",
    required: true,
    purpose: "接收微信支付异步回调并验签，更新订单与支付状态。",
    notes: "回调 URL 必须公网可达，并配合平台证书完成签名校验。",
  },
  {
    provider: "wechat_pay",
    capability: "订单查询",
    phase: "query",
    method: "GET",
    endpoint: "/v3/pay/transactions/out-trade-no/{out_trade_no}",
    required: true,
    purpose: "在回调延迟、丢失或人工排障时主动核单。",
    notes: "建议与本地补偿任务结合。",
  },
  {
    provider: "wechat_pay",
    capability: "退款申请",
    phase: "refund",
    method: "POST",
    endpoint: "/v3/refund/domestic/refunds",
    required: false,
    purpose: "售后场景发起原路退款。",
    notes: "若接入售后，需同步设计退款回调与查询。",
  },
  {
    provider: "wechat_pay",
    capability: "退款结果通知",
    phase: "callback",
    method: "POST",
    endpoint: "商户自定义 refund_notify_url",
    required: false,
    purpose: "接收退款异步结果并更新售后状态。",
    notes: "与退款申请配套使用。",
  },
  {
    provider: "wechat_pay",
    capability: "商家转账",
    phase: "transfer",
    method: "POST",
    endpoint: "/v3/transfer/batches",
    required: false,
    purpose: "向个人零钱或结算场景发起企业付款。",
    notes: "仅在后续需要平台主动打款时接入。",
  },
  {
    provider: "alipay",
    capability: "统一收单创建交易",
    phase: "create",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.trade.create",
    required: true,
    purpose: "创建支付宝交易单。",
    notes: "不同终端收银形态由 product_code 与 buyer_id/open_id 区分。",
  },
  {
    provider: "alipay",
    capability: "支付结果通知",
    phase: "callback",
    method: "POST",
    endpoint: "商户自定义 notify_url",
    required: true,
    purpose: "接收支付宝支付异步通知并验签。",
    notes: "需要支付宝公钥、应用私钥与签名算法配置。",
  },
  {
    provider: "alipay",
    capability: "订单查询",
    phase: "query",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.trade.query",
    required: true,
    purpose: "当回调缺失时主动核单。",
    notes: "建议用 out_trade_no 做幂等补偿。",
  },
  {
    provider: "alipay",
    capability: "退款申请",
    phase: "refund",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.trade.refund",
    required: false,
    purpose: "售后退款。",
    notes: "可与退款查询接口一起规划。",
  },
  {
    provider: "alipay",
    capability: "单笔转账",
    phase: "transfer",
    method: "POST",
    endpoint: "/gateway.do?method=alipay.fund.trans.uni.transfer",
    required: false,
    purpose: "企业向支付宝账户付款。",
    notes: "适合佣金结算或返利。",
  },
];

const PAYMENT_GATEWAY_CREATE_CONFIG_REQUIREMENTS: Record<PaymentGateway, string[]> = {
  wechat_pay_v3: ["WECHAT_PAY_MCHID", "WECHAT_PAY_APPID", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_PRIVATE_KEY_PEM"],
  alipay_openapi: ["ALIPAY_APP_ID", "ALIPAY_PRIVATE_KEY", "ALIPAY_NOTIFY_URL", "ALIPAY_SIGN_TYPE"],
};

const PAYMENT_GATEWAY_CALLBACK_CONFIG_REQUIREMENTS: Record<PaymentGateway, string[]> = {
  wechat_pay_v3: ["WECHAT_PAY_API_V3_KEY", "WECHAT_PAY_PLATFORM_CERT_PEM or (WECHAT_PAY_PUBLIC_KEY_PEM + WECHAT_PAY_PUBLIC_KEY_ID)"],
  alipay_openapi: ["ALIPAY_PUBLIC_KEY", "ALIPAY_SIGN_TYPE"],
};

type RuntimePaymentMode = "sandbox" | "production_ready" | "production_live";

const WECHAT_GATEWAY_ENV_ALIASES: Record<string, string[]> = {
  WECHAT_PAY_MCHID: ["WECHAT_PAY_MCHID"],
  WECHAT_PAY_APPID: ["WECHAT_PAY_APPID"],
  WECHAT_PAY_CERT_SERIAL_NO: ["WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_CERT_SERIAL_NO", "WECHAT_PAY_SERIAL_NO"],
  WECHAT_PAY_PRIVATE_KEY_PEM: ["WECHAT_PAY_PRIVATE_KEY_PEM", "WECHAT_PAY_PRIVATE_KEY"],
  WECHAT_PAY_API_V3_KEY: ["WECHAT_PAY_API_V3_KEY"],
  WECHAT_PAY_PLATFORM_CERT_PEM: ["WECHAT_PAY_PLATFORM_CERT_PEM"],
  WECHAT_PAY_PUBLIC_KEY_PEM: [
    "WECHAT_PAY_PUBLIC_KEY_PEM",
    "WECHAT_PAY_PLATFORM_PUBLIC_KEY_PEM",
    "WECHAT_PAY_PLATFORM_CERT_PATH_OR_PUBLIC_KEY",
  ],
  WECHAT_PAY_PUBLIC_KEY_ID: ["WECHAT_PAY_PUBLIC_KEY_ID", "WECHAT_PAY_PLATFORM_PUBLIC_KEY_ID"],
};

const WECHAT_PEM_CONFIG_KEYS = new Set([
  "WECHAT_PAY_PRIVATE_KEY_PEM",
  "WECHAT_PAY_PLATFORM_CERT_PEM",
  "WECHAT_PAY_PUBLIC_KEY_PEM",
]);

let wechatHttpRequest: typeof https.request = https.request;

export function setWechatHttpRequestForTest(requestImpl: typeof https.request | null) {
  wechatHttpRequest = requestImpl ?? https.request;
}

function normalizeRequestSnapshot(input: PaymentGatewayCreateOrderInput) {
  return {
    brandId: input.brandId,
    orderId: input.orderId,
    orderNo: input.orderNo,
    amount: input.amount,
    currency: input.currency,
    description: input.description,
    notifyUrl: input.notifyUrl,
    returnUrl: input.returnUrl ?? null,
    payer: input.payer ?? null,
    metadata: input.metadata ?? null,
  };
}

function normalizeCallbackSnapshot(input: PaymentWebhookCallbackInput) {
  return {
    headers: input.headers,
    query: input.query ?? null,
    rawBodyPreview: input.rawBody.slice(0, 1000),
  };
}

function readEnvironmentValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function formatPemLabel(label: string) {
  return label
    .replace(/ENCRYPTEDPRIVATEKEY/g, "ENCRYPTED PRIVATE KEY")
    .replace(/RSAPRIVATEKEY/g, "RSA PRIVATE KEY")
    .replace(/ECPRIVATEKEY/g, "EC PRIVATE KEY")
    .replace(/PRIVATEKEY/g, "PRIVATE KEY")
    .replace(/PUBLICKEY/g, "PUBLIC KEY")
    .replace(/CERTIFICATE/g, "CERTIFICATE");
}

export function normalizePemEnvironmentValue(value: string) {
  const normalized = value.trim().replace(/\\n/g, "\n").replace(/\r\n/g, "\n");
  if (normalized.includes("BEGIN ") && normalized.includes("\n")) {
    return normalized;
  }

  const compact = normalized.replace(/\s+/g, "");
  const match = compact.match(/^-----BEGIN([A-Z0-9]+)-----([A-Za-z0-9+/=]+)-----END([A-Z0-9]+)-----$/);
  if (!match) {
    return normalized;
  }

  const beginLabel = formatPemLabel(match[1]);
  const endLabel = formatPemLabel(match[3]);
  const body = (match[2].match(/.{1,64}/g) ?? [match[2]]).join("\n");
  return `-----BEGIN ${beginLabel}-----\n${body}\n-----END ${endLabel}-----`;
}

function resolveWechatConfigValue(configKey: string) {
  const value = readEnvironmentValue(WECHAT_GATEWAY_ENV_ALIASES[configKey] ?? [configKey]);
  if (!value) {
    return null;
  }
  return WECHAT_PEM_CONFIG_KEYS.has(configKey) ? normalizePemEnvironmentValue(value) : value;
}

function collectMissingWechatConfigs(configKeys: string[]) {
  return configKeys.filter((configKey) => !resolveWechatConfigValue(configKey));
}

function hasWechatCallbackVerificationMaterial() {
  const platformCertPem = resolveWechatConfigValue("WECHAT_PAY_PLATFORM_CERT_PEM");
  const hasPlatformCert = Boolean(platformCertPem && readWechatCertificateSerial(platformCertPem));
  const hasPublicKeyPem = Boolean(resolveWechatConfigValue("WECHAT_PAY_PUBLIC_KEY_PEM"));
  const hasPublicKeyId = Boolean(resolveWechatConfigValue("WECHAT_PAY_PUBLIC_KEY_ID"));

  return {
    hasPlatformCert,
    hasPublicKeyPem,
    hasPublicKeyId,
    hasPublicKeyBundle: hasPublicKeyPem && hasPublicKeyId,
    isReady: hasPlatformCert || (hasPublicKeyPem && hasPublicKeyId),
  };
}

function collectMissingWechatCallbackConfigs() {
  const missingConfigs: string[] = [];
  const hasApiV3Key = Boolean(resolveWechatConfigValue("WECHAT_PAY_API_V3_KEY"));
  const verificationMaterial = hasWechatCallbackVerificationMaterial();

  if (!hasApiV3Key) {
    missingConfigs.push("WECHAT_PAY_API_V3_KEY");
  }

  if (verificationMaterial.isReady) {
    return missingConfigs;
  }

  if (!verificationMaterial.hasPlatformCert && !verificationMaterial.hasPublicKeyPem && !verificationMaterial.hasPublicKeyId) {
    missingConfigs.push("WECHAT_PAY_PLATFORM_CERT_PEM or (WECHAT_PAY_PUBLIC_KEY_PEM + WECHAT_PAY_PUBLIC_KEY_ID)");
    return missingConfigs;
  }

  if (!verificationMaterial.hasPlatformCert) {
    if (!verificationMaterial.hasPublicKeyPem) {
      missingConfigs.push("WECHAT_PAY_PUBLIC_KEY_PEM");
    }
    if (!verificationMaterial.hasPublicKeyId) {
      missingConfigs.push("WECHAT_PAY_PUBLIC_KEY_ID");
    }
  }

  return missingConfigs;
}

type WechatCallbackVerificationMaterial =
  | {
      mode: "platform_cert";
      pem: string;
      keyId: string;
    }
  | {
      mode: "public_key";
      pem: string;
      keyId: string;
    };

type WechatSignatureVerificationResult = {
  ok: boolean;
  mode: WechatCallbackVerificationMaterial["mode"];
  reason: string;
};

function readSingleHeaderValue(headers: Record<string, string | string[] | undefined>, key: string) {
  const value = headers[key.toLowerCase()] ?? headers[key];
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function readWechatCertificateSerial(pem: string) {
  try {
    return new X509Certificate(pem).serialNumber.replace(/:/g, "").toUpperCase();
  } catch {
    return null;
  }
}

function resolveWechatCallbackVerificationMode(): WechatCallbackVerificationMaterial | null {
  const platformCertPem = resolveWechatConfigValue("WECHAT_PAY_PLATFORM_CERT_PEM");
  if (platformCertPem) {
    const platformSerial = readWechatCertificateSerial(platformCertPem);
    if (platformSerial) {
      return {
        mode: "platform_cert",
        pem: platformCertPem,
        keyId: platformSerial,
      };
    }
  }

  const publicKeyPem = resolveWechatConfigValue("WECHAT_PAY_PUBLIC_KEY_PEM");
  const publicKeyId = resolveWechatConfigValue("WECHAT_PAY_PUBLIC_KEY_ID");
  if (publicKeyPem && publicKeyId) {
    return {
      mode: "public_key",
      pem: publicKeyPem,
      keyId: publicKeyId,
    };
  }

  return null;
}

function buildWechatSignatureMessage(timestamp: string, nonce: string, rawBody: string) {
  return `${timestamp}\n${nonce}\n${rawBody}\n`;
}

export function verifyWechatCallbackSignature(input: PaymentWebhookCallbackInput): WechatSignatureVerificationResult {
  const timestamp = readSingleHeaderValue(input.headers, "wechatpay-timestamp");
  const nonce = readSingleHeaderValue(input.headers, "wechatpay-nonce");
  const signature = readSingleHeaderValue(input.headers, "wechatpay-signature");
  const serial = readSingleHeaderValue(input.headers, "wechatpay-serial");
  const verificationMaterial = resolveWechatCallbackVerificationMode();

  if (!verificationMaterial) {
    return {
      ok: false,
      mode: "public_key",
      reason: "verification_material_missing",
    };
  }

  if (!timestamp || !nonce || !signature || !serial) {
    return {
      ok: false,
      mode: verificationMaterial.mode,
      reason: "signature_headers_missing",
    };
  }

  if (serial !== verificationMaterial.keyId) {
    return {
      ok: false,
      mode: verificationMaterial.mode,
      reason: "wechatpay_serial_mismatch",
    };
  }

  try {
    const verifier = createVerify("RSA-SHA256");
    verifier.update(buildWechatSignatureMessage(timestamp, nonce, input.rawBody));
    verifier.end();
    const publicKey = createPublicKey(verificationMaterial.pem);
    const ok = verifier.verify(publicKey, signature, "base64");
    return {
      ok,
      mode: verificationMaterial.mode,
      reason: ok ? "verified" : "signature_invalid",
    };
  } catch {
    return {
      ok: false,
      mode: verificationMaterial.mode,
      reason: "verification_runtime_error",
    };
  }
}

export function decryptWechatCallbackResource(resource: Record<string, unknown>) {
  const apiV3Key = resolveWechatConfigValue("WECHAT_PAY_API_V3_KEY");
  const nonce = readStringCandidate(resource.nonce);
  const ciphertext = readStringCandidate(resource.ciphertext);
  const associatedData = readStringCandidate(resource.associated_data) ?? "";

  if (!apiV3Key) {
    throw new Error("WECHAT_PAY_API_V3_KEY_missing");
  }
  if (!nonce || !ciphertext) {
    throw new Error("wechat_callback_resource_incomplete");
  }

  const ciphertextBuffer = Buffer.from(ciphertext, "base64");
  const authTag = ciphertextBuffer.subarray(ciphertextBuffer.length - 16);
  const encrypted = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(apiV3Key, "utf8"), Buffer.from(nonce, "utf8"));
  if (associatedData) {
    decipher.setAAD(Buffer.from(associatedData, "utf8"));
  }
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  return toRecord(JSON.parse(decrypted));
}

function buildWechatAuthorizationHeader(args: {
  mchid: string;
  serialNo: string;
  privateKeyPem: string;
  method: string;
  pathname: string;
  body?: string;
}) {
  const nonce = randomUUID().replace(/-/g, "");
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${args.method}\n${args.pathname}\n${timestamp}\n${nonce}\n${args.body ?? ""}\n`;
  const sign = createSign("RSA-SHA256");
  sign.update(message);
  sign.end();
  const signature = sign.sign(args.privateKeyPem, "base64");

  return {
    nonce,
    timestamp,
    authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${args.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${args.serialNo}"`,
  };
}

function buildWechatJsapiOrderRequest(input: PaymentGatewayCreateOrderInput) {
  const mchid = resolveWechatConfigValue("WECHAT_PAY_MCHID");
  const appId = resolveWechatConfigValue("WECHAT_PAY_APPID");
  const serialNo = resolveWechatConfigValue("WECHAT_PAY_CERT_SERIAL_NO");
  const privateKeyPem = resolveWechatConfigValue("WECHAT_PAY_PRIVATE_KEY_PEM");
  const payerOpenId = readStringCandidate(input.payer?.openId);

  if (!mchid || !appId || !serialNo || !privateKeyPem || !payerOpenId) {
    return null;
  }

  const pathname = "/v3/pay/transactions/jsapi";
  const body = JSON.stringify({
    appid: appId,
    mchid,
    description: input.description,
    out_trade_no: input.orderNo,
    notify_url: input.notifyUrl,
    amount: {
      total: input.amount,
      currency: input.currency,
    },
    payer: {
      openid: payerOpenId,
    },
  });
  const authorization = buildWechatAuthorizationHeader({
    mchid,
    serialNo,
    privateKeyPem,
    method: "POST",
    pathname,
    body,
  });

  return {
    method: "POST" as const,
    pathname,
    body,
    headers: {
      Accept: "application/json",
      Authorization: authorization.authorization,
      "Content-Type": "application/json",
      "User-Agent": "iCloush-WechatPay/1.0",
      "Wechatpay-Serial": serialNo,
      "X-Request-Nonce": authorization.nonce,
      "X-Request-Timestamp": authorization.timestamp,
    },
  };
}

function buildWechatJsapiClientPayload(prepayId: string) {
  const appId = resolveWechatConfigValue("WECHAT_PAY_APPID");
  const mchId = resolveWechatConfigValue("WECHAT_PAY_MCHID");
  const privateKeyPem = resolveWechatConfigValue("WECHAT_PAY_PRIVATE_KEY_PEM");

  if (!appId || !mchId || !privateKeyPem) {
    return null;
  }

  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = randomUUID().replace(/-/g, "");
  const packageValue = `prepay_id=${prepayId}`;
  const sign = createSign("RSA-SHA256");
  sign.update(`${appId}\n${timeStamp}\n${nonceStr}\n${packageValue}\n`);
  sign.end();

  return {
    appId,
    mchId,
    timeStamp,
    nonceStr,
    package: packageValue,
    signType: "RSA",
    paySign: sign.sign(privateKeyPem, "base64"),
    prepayId,
  };
}

async function sendWechatJsonRequest(args: {
  method: "POST";
  pathname: string;
  headers: Record<string, string>;
  body: string;
}) {
  return await new Promise<{
    status: number;
    body: string;
    json: Record<string, unknown> | null;
  }>((resolve, reject) => {
    const req = wechatHttpRequest(
      {
        protocol: "https:",
        hostname: "api.mch.weixin.qq.com",
        method: args.method,
        path: args.pathname,
        headers: {
          ...args.headers,
          "Content-Length": Buffer.byteLength(args.body).toString(),
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on("end", () => {
          const body = Buffer.concat(chunks).toString("utf8");
          resolve({
            status: res.statusCode ?? 0,
            body,
            json: parseWebhookBody(body),
          });
        });
      },
    );

    req.on("error", (error) => reject(error));
    req.write(args.body);
    req.end();
  });
}

function resolveRuntimePaymentMode(metadata: Record<string, unknown> | null | undefined): RuntimePaymentMode {
  const value = metadata?.paymentMode;
  return value === "production_ready" || value === "production_live" ? value : "sandbox";
}

function toRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function readStringCandidate(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function readNumberCandidate(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function parseWebhookBody(rawBody: string) {
  try {
    return toRecord(JSON.parse(rawBody));
  } catch {
    return null;
  }
}

function buildPendingGatewayOrderResult(input: PaymentGatewayCreateOrderInput): PaymentGatewayCreateOrderResult {
  return {
    gateway: input.gateway,
    stage: "pending_configuration",
    providerOrderId: null,
    clientPayload: null,
    requiredConfigs: PAYMENT_GATEWAY_CREATE_CONFIG_REQUIREMENTS[input.gateway],
    requestSnapshot: normalizeRequestSnapshot(input),
    notes:
      input.gateway === "wechat_pay_v3"
        ? [
            "当前仅完成微信支付 V3 的接口抽象与入参快照，尚未注入商户证书、APIv3 Key 与平台证书。",
            "正式接入时应在服务端根据 openId 选择 JSAPI 或小程序链路，并使用 SDK 生成 prepay_id 与前端调起参数。",
          ]
        : [
            "当前仅完成支付宝开放平台网关抽象，尚未注入应用私钥、支付宝公钥与签名方式。",
            "正式接入时应基于场景选择 trade.create、trade.page.pay 或 trade.wap.pay，并把 buyer 标识与 notify_url 纳入统一回调链路。",
          ],
  };
}

function buildPendingGatewayCallbackResult(input: PaymentWebhookCallbackInput): PaymentWebhookCallbackResult {
  return {
    gateway: input.gateway,
    stage: "pending_configuration",
    verified: false,
    eventType: null,
    providerOrderId: null,
    orderNo: null,
    amount: null,
    responseStatus: 202,
    responseBody: "gateway_not_configured",
    notes:
      input.gateway === "wechat_pay_v3"
        ? [
            "当前未注入微信支付平台证书或支付公钥，因此不能对回调头中的签名进行正式验证。",
            "正式实现时需先基于 Wechatpay-Timestamp、Wechatpay-Nonce、Wechatpay-Signature、Wechatpay-Serial 进行验签，再解密 resource 字段并更新订单状态。",
          ]
        : [
            "当前未注入支付宝公钥与签名方式，因此不能对 notify_url 回调执行正式验签。",
            "正式实现时需保留原始表单或 JSON 字段顺序，去除 sign 与 sign_type 后再按支付宝规则验签。",
          ],
  };
}

async function buildWechatGatewayOrderResult(input: PaymentGatewayCreateOrderInput): Promise<PaymentGatewayCreateOrderResult> {
  const mode = resolveRuntimePaymentMode(input.metadata);
  if (mode === "sandbox") {
    return buildPendingGatewayOrderResult(input);
  }

  const missingConfigs = collectMissingWechatConfigs(PAYMENT_GATEWAY_CREATE_CONFIG_REQUIREMENTS.wechat_pay_v3);
  const hasOpenId = typeof input.payer?.openId === "string" && input.payer.openId.trim().length > 0;
  const requestSnapshot = normalizeRequestSnapshot(input);

  if (mode === "production_ready" || missingConfigs.length > 0 || !hasOpenId) {
    const requiredConfigs = [...missingConfigs, ...(hasOpenId ? [] : ["WECHAT_PAYER_OPENID"])] as string[];
    return {
      gateway: "wechat_pay_v3",
      stage: "ready_for_sdk",
      providerOrderId: null,
      clientPayload: {
        mode,
        integration: "wechat_pay_v3_preflight",
        notifyUrl: input.notifyUrl,
        returnUrl: input.returnUrl ?? null,
        missingPayerOpenId: !hasOpenId,
      },
      requiredConfigs,
      requestSnapshot,
      notes: [
        mode === "production_ready"
          ? "当前商品处于 production_ready，链路已切到正式支付预备分支，但不会真正调用微信网关创建交易。"
          : !hasOpenId
            ? "当前商品已处于 production_live，服务端正式 JSAPI 建单能力已就绪，但缺少 payerOpenId，因此不会向微信网关发起真实建单。"
            : "当前商品处于 production_live，但正式微信建单所需配置仍不完整，因此回退到可诊断的 ready_for_sdk 阶段。",
        "此返回已显式区分缺失配置与缺少 payerOpenId 两类阻塞，便于后续联调直接补齐真实付款人标识。",
      ],
    };
  }

  const request = buildWechatJsapiOrderRequest(input);
  if (!request) {
    return {
      gateway: "wechat_pay_v3",
      stage: "ready_for_sdk",
      providerOrderId: null,
      clientPayload: {
        mode,
        integration: "wechat_pay_v3_preflight",
        notifyUrl: input.notifyUrl,
        returnUrl: input.returnUrl ?? null,
        missingPayerOpenId: !hasOpenId,
      },
      requiredConfigs: [...missingConfigs, ...(hasOpenId ? [] : ["WECHAT_PAYER_OPENID"])],
      requestSnapshot,
      notes: ["当前已进入 production_live，但建单请求在服务端组装阶段失败，通常意味着商户配置或 payerOpenId 仍未满足微信 JSAPI 要求。"],
    };
  }

  try {
    const response = await sendWechatJsonRequest(request);
    const prepayId = readStringCandidate(response.json?.prepay_id);
    if (response.status >= 200 && response.status < 300 && prepayId) {
      const clientPayload = buildWechatJsapiClientPayload(prepayId);
      if (!clientPayload) {
        return {
          gateway: "wechat_pay_v3",
          stage: "ready_for_sdk",
          providerOrderId: null,
          clientPayload: {
            mode,
            integration: "wechat_pay_v3_live_error",
            httpStatus: response.status,
            prepayId,
          },
          requiredConfigs: PAYMENT_GATEWAY_CREATE_CONFIG_REQUIREMENTS.wechat_pay_v3,
          requestSnapshot,
          notes: ["微信已成功返回 prepay_id，但服务端无法生成前端调起签名参数，需检查商户私钥或 AppID 读取是否一致。"],
        };
      }

      return {
        gateway: "wechat_pay_v3",
        stage: "processing",
        providerOrderId: prepayId,
        clientPayload: {
          mode,
          integration: "wechat_pay_v3_live",
          orderNo: input.orderNo,
          notifyUrl: input.notifyUrl,
          returnUrl: input.returnUrl ?? null,
          ...clientPayload,
        },
        requiredConfigs: [],
        requestSnapshot,
        notes: [
          "production_live 已成功调用微信 `/v3/pay/transactions/jsapi` 并拿到 prepay_id。",
          "当前返回已包含前端可直接调起支付所需的二次签名参数。",
        ],
      };
    }

    const errorCode = readStringCandidate(response.json?.code, response.json?.err_code);
    const errorMessage = readStringCandidate(response.json?.message, response.json?.err_code_des, response.body);
    return {
      gateway: "wechat_pay_v3",
      stage: "ready_for_sdk",
      providerOrderId: null,
      clientPayload: {
        mode,
        integration: "wechat_pay_v3_live_error",
        httpStatus: response.status,
        errorCode: errorCode ?? null,
        errorMessage: errorMessage ?? null,
      },
      requiredConfigs: [],
      requestSnapshot,
      notes: [
        `微信 JSAPI 正式建单已发起，但上游返回 ${response.status}${errorCode ? ` / ${errorCode}` : ""}。`,
        errorMessage ? `上游消息：${errorMessage}` : "上游未返回可读错误消息。",
      ],
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      gateway: "wechat_pay_v3",
      stage: "ready_for_sdk",
      providerOrderId: null,
      clientPayload: {
        mode,
        integration: "wechat_pay_v3_live_network_error",
        errorMessage: message,
      },
      requiredConfigs: [],
      requestSnapshot,
      notes: [
        "微信 JSAPI 正式建单请求在网络层失败，服务端已保留可诊断结果，便于继续区分 TLS、网关策略或参数问题。",
        `网络层错误：${message}`,
      ],
    };
  }
}

function buildWechatGatewayCallbackResult(input: PaymentWebhookCallbackInput): PaymentWebhookCallbackResult {
  const parsedBody = parseWebhookBody(input.rawBody);
  const resource = toRecord(parsedBody?.resource);
  const missingConfigs = collectMissingWechatCallbackConfigs();
  let decryptedResource: Record<string, unknown> | null = null;
  let decryptionFailureReason: string | null = null;
  const eventType = readStringCandidate(parsedBody?.event_type, parsedBody?.eventType, parsedBody?.type);

  if (missingConfigs.length > 0) {
    const orderNo = readStringCandidate(input.query?.out_trade_no, parsedBody?.out_trade_no, parsedBody?.orderNo, resource?.out_trade_no, resource?.orderNo);
    const providerOrderId = readStringCandidate(parsedBody?.transaction_id, parsedBody?.providerOrderId, resource?.transaction_id);
    const amount = readNumberCandidate(toRecord(parsedBody?.amount)?.total, parsedBody?.amount, toRecord(resource?.amount)?.total, resource?.amount);

    return {
      gateway: "wechat_pay_v3",
      stage: "ready_for_sdk",
      verified: false,
      eventType,
      providerOrderId,
      orderNo,
      amount,
      requiredConfigs: missingConfigs,
      responseStatus: 202,
      responseBody: "callback_verification_not_ready",
      notes: [
        "production 回调入口已生效，但当前仍缺少 APIv3 Key、微信平台证书，或缺少成对的微信支付公钥配置，暂时只能受理并暴露诊断信息，不能执行正式验签与解密。",
        `回调快照：${JSON.stringify(normalizeCallbackSnapshot(input))}`,
      ],
    };
  }

  const signatureVerification = verifyWechatCallbackSignature(input);
  if (!signatureVerification.ok) {
    const orderNo = readStringCandidate(input.query?.out_trade_no, parsedBody?.out_trade_no, parsedBody?.orderNo, resource?.out_trade_no, resource?.orderNo);
    const providerOrderId = readStringCandidate(parsedBody?.transaction_id, parsedBody?.providerOrderId, resource?.transaction_id);
    const amount = readNumberCandidate(toRecord(parsedBody?.amount)?.total, parsedBody?.amount, toRecord(resource?.amount)?.total, resource?.amount);

    return {
      gateway: "wechat_pay_v3",
      stage: "ignored",
      verified: false,
      eventType,
      providerOrderId,
      orderNo,
      amount,
      responseStatus: 401,
      responseBody: "invalid_wechatpay_signature",
      notes: [
        `微信 callback 验签失败，当前模式：${signatureVerification.mode}，失败原因：${signatureVerification.reason}。`,
        `回调快照：${JSON.stringify(normalizeCallbackSnapshot(input))}`,
      ],
    };
  }

  if (resource) {
    try {
      decryptedResource = decryptWechatCallbackResource(resource);
    } catch (error) {
      decryptionFailureReason = error instanceof Error ? error.message : "wechat_callback_resource_decrypt_failed";
    }
  }

  const orderNo = readStringCandidate(
    input.query?.out_trade_no,
    parsedBody?.out_trade_no,
    parsedBody?.orderNo,
    decryptedResource?.out_trade_no,
    decryptedResource?.orderNo,
    resource?.out_trade_no,
    resource?.orderNo,
  );
  const providerOrderId = readStringCandidate(
    parsedBody?.transaction_id,
    parsedBody?.providerOrderId,
    decryptedResource?.transaction_id,
    resource?.transaction_id,
  );
  const amount = readNumberCandidate(
    toRecord(parsedBody?.amount)?.total,
    parsedBody?.amount,
    toRecord(decryptedResource?.amount)?.total,
    decryptedResource?.amount,
    toRecord(resource?.amount)?.total,
    resource?.amount,
  );

  if (resource && !decryptedResource) {
    return {
      gateway: "wechat_pay_v3",
      stage: "processing",
      verified: true,
      eventType,
      providerOrderId,
      orderNo,
      amount,
      responseStatus: 202,
      responseBody: "callback_verified_but_resource_decrypt_pending",
      notes: [
        `已通过微信 callback 签名验证，但 resource 解密失败：${decryptionFailureReason ?? "unknown"}。`,
        "这通常意味着 APIv3 Key 不匹配、resource 字段不完整，或当前回调并非加密资源体。",
        `回调快照：${JSON.stringify(normalizeCallbackSnapshot(input))}`,
      ],
    };
  }

  return {
    gateway: "wechat_pay_v3",
    stage: "verified",
    verified: true,
    eventType,
    providerOrderId,
    orderNo,
    amount,
    responseStatus: 200,
    responseBody: '{"code":"SUCCESS","message":"成功"}',
    notes: [
      `已通过微信 callback 签名验证，当前模式：${signatureVerification.mode}。`,
      decryptedResource ? "已完成 resource 解密并提取交易字段，下一步可直接接入订单状态落库。" : "当前回调未包含可解密的 resource 体，但验签入口已经就绪。",
      `回调快照：${JSON.stringify(normalizeCallbackSnapshot(input))}`,
    ],
  };
}

const paymentGateways: Record<PaymentGateway, PaymentGatewayInterface> = {
  wechat_pay_v3: {
    gateway: "wechat_pay_v3",
    async createPaymentOrder(input) {
      return buildWechatGatewayOrderResult(input);
    },
    async paymentWebhookCallback(input) {
      return buildWechatGatewayCallbackResult(input);
    },
  },
  alipay_openapi: {
    gateway: "alipay_openapi",
    async createPaymentOrder(input) {
      return buildPendingGatewayOrderResult(input);
    },
    async paymentWebhookCallback(input) {
      return buildPendingGatewayCallbackResult(input);
    },
  },
};

export function getPaymentApiInventory() {
  return PAYMENT_API_INVENTORY;
}

export function getPaymentGatewayInterface(gateway: PaymentGateway): PaymentGatewayInterface {
  return paymentGateways[gateway];
}

export async function createPaymentOrder(input: PaymentGatewayCreateOrderInput) {
  return getPaymentGatewayInterface(input.gateway).createPaymentOrder(input);
}

export async function paymentWebhookCallback(input: PaymentWebhookCallbackInput) {
  return getPaymentGatewayInterface(input.gateway).paymentWebhookCallback(input);
}

export function buildWechatPaymentDraft(args: {
  brandId: number;
  orderId: number;
  orderNo: string;
  amount: number;
  openId?: string | null;
  paymentScenario?: PaymentScenario;
  installmentPlanCode?: string | null;
}) {
  const paymentScenario = args.paymentScenario ?? "full_payment";
  return {
    provider: "wechat_jsapi" as const,
    integrationMode: "stubbed" as const,
    status: "pending_provider_configuration" as const,
    capabilities: {
      supportsCreditCard: paymentScenario === "credit_card" || paymentScenario === "installment",
      supportsInstallment: paymentScenario === "installment",
    },
    jsapiParams: null,
    requiredApis: PAYMENT_API_INVENTORY.filter((item) => item.provider === "wechat_pay"),
    metadata: {
      brandId: args.brandId,
      orderId: args.orderId,
      orderNo: args.orderNo,
      amount: args.amount,
      paymentScenario,
      installmentPlanCode: args.installmentPlanCode ?? null,
      payerOpenId: args.openId ?? null,
    },
  };
}

export async function prepareWechatPrepayDraft(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId?: number;
  payerOpenId?: string | null;
  paymentScenario?: PaymentScenario;
  installmentPlanCode?: string | null;
}) {
  const matchedOrder = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  const order = matchedOrder[0];
  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在，无法生成微信支付草稿。",
    });
  }

  const paymentRows = await args.db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.brandId, args.brandId),
        eq(payments.orderId, order.id),
        args.paymentId ? eq(payments.id, args.paymentId) : eq(payments.provider, "wechat_jsapi"),
      ),
    )
    .orderBy(desc(payments.id))
    .limit(1);

  let payment = paymentRows[0];
  const paymentScenario = args.paymentScenario ?? "full_payment";

  if (!payment) {
    const inserted = await args.db
      .insert(payments)
      .values({
        brandId: args.brandId,
        orderId: order.id,
        paymentNo: buildPaymentNo(args.brandId),
        provider: "wechat_jsapi",
        paymentScenario,
        amount: order.payableAmount,
        status: "created",
        metaJson: {
          payerOpenId: args.payerOpenId ?? null,
          installmentPlanCode: args.installmentPlanCode ?? null,
        },
      })
      .$returningId();

    const createdRows = await args.db.select().from(payments).where(eq(payments.id, inserted[0].id)).limit(1);
    payment = createdRows[0];
  } else {
    await args.db
      .update(payments)
      .set({
        paymentScenario,
        metaJson: {
          ...normalizeMetaJson(payment.metaJson),
          payerOpenId: args.payerOpenId ?? null,
          installmentPlanCode: args.installmentPlanCode ?? null,
        },
        updatedAt: new Date(),
      })
      .where(eq(payments.id, payment.id));
  }

  return {
    order,
    payment,
    draft: buildWechatPaymentDraft({
      brandId: args.brandId,
      orderId: order.id,
      orderNo: order.orderNo,
      amount: payment?.amount ?? order.payableAmount,
      openId: args.payerOpenId,
      paymentScenario,
      installmentPlanCode: args.installmentPlanCode,
    }),
  };
}

export function getBankTransferAccountInfo() {
  return {
    beneficiaryName: process.env.BANK_TRANSFER_ACCOUNT_NAME ?? "iCloush Finance Team",
    bankName: process.env.BANK_TRANSFER_BANK_NAME ?? "Pending Configuration Bank",
    accountNo: process.env.BANK_TRANSFER_ACCOUNT_NO ?? "PENDING-CONFIGURATION",
    branchName: process.env.BANK_TRANSFER_BRANCH_NAME ?? null,
    instructions:
      process.env.BANK_TRANSFER_INSTRUCTIONS ??
      "请在汇款附言中填写订单号，并在上传凭证后等待财务审核。",
  };
}

export async function submitBankTransferVoucher(args: {
  db: DatabaseClient;
  brandId: number;
  orderId: number;
  paymentId?: number;
  voucherUrl: string;
  remitterName?: string | null;
  remitterAccountLast4?: string | null;
  transferReference?: string | null;
  transferAmount?: number | null;
  notifyAdmin?: (payload: { title: string; content: string }) => Promise<boolean>;
}) {
  const matchedOrder = await args.db
    .select()
    .from(orders)
    .where(and(eq(orders.id, args.orderId), eq(orders.brandId, args.brandId)))
    .limit(1);

  const order = matchedOrder[0];
  if (!order) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "订单不存在，无法上传对公转账凭证。",
    });
  }

  let payment = (
    await args.db
      .select()
      .from(payments)
      .where(
        and(
          eq(payments.brandId, args.brandId),
          eq(payments.orderId, order.id),
          args.paymentId ? eq(payments.id, args.paymentId) : eq(payments.provider, "offline_bank_transfer"),
        ),
      )
      .orderBy(desc(payments.id))
      .limit(1)
  )[0];

  if (!payment) {
    const created = await args.db
      .insert(payments)
      .values({
        brandId: args.brandId,
        orderId: order.id,
        paymentNo: buildPaymentNo(args.brandId),
        provider: "offline_bank_transfer",
        paymentScenario: "offline_review",
        amount: order.payableAmount,
        status: "reviewing",
        metaJson: {
          remitterName: args.remitterName ?? null,
          remitterAccountLast4: args.remitterAccountLast4 ?? null,
          transferReference: args.transferReference ?? null,
        },
      })
      .$returningId();

    const createdPaymentRows = await args.db.select().from(payments).where(eq(payments.id, created[0].id)).limit(1);
    payment = createdPaymentRows[0];
  }

  const insertedReceipt = await args.db
    .insert(bankTransferReceipts)
    .values({
      brandId: args.brandId,
      orderId: order.id,
      paymentId: payment.id,
      payerName: args.remitterName ?? null,
      payerAccountNo: args.remitterAccountLast4 ? `****${args.remitterAccountLast4}` : null,
      receiptFileKey: extractFileKeyFromUrl(args.voucherUrl),
      receiptFileUrl: args.voucherUrl,
      reviewStatus: "pending",
    })
    .$returningId();

  await args.db
    .update(orders)
    .set({
      status: "under_review",
      paymentStatus: "offline_review",
      updatedAt: new Date(),
    })
    .where(eq(orders.id, order.id));

  await args.db
    .update(payments)
    .set({
      status: "reviewing",
      paymentScenario: "offline_review",
      metaJson: {
        ...normalizeMetaJson(payment.metaJson),
        remitterName: args.remitterName ?? null,
        remitterAccountLast4: args.remitterAccountLast4 ?? null,
        transferReference: args.transferReference ?? null,
        transferAmount: args.transferAmount ?? order.payableAmount,
      },
      updatedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  const notification = {
    title: `订单 ${order.orderNo} 已提交对公转账凭证`,
    content: `品牌 ${args.brandId} 的订单 ${order.orderNo} 已进入财务审核。付款金额：${args.transferAmount ?? order.payableAmount} ${order.currency}；汇款人：${args.remitterName ?? "未填写"}；参考号：${args.transferReference ?? "未填写"}`,
  };

  const notificationSent = args.notifyAdmin ? await args.notifyAdmin(notification) : false;

  return {
    orderId: order.id,
    paymentId: payment.id,
    receiptId: insertedReceipt[0].id,
    nextStatus: "under_review" as const,
    notification: {
      ...notification,
      sent: notificationSent,
    },
  };
}
