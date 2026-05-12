import { createDecipheriv, createSign, randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

type WechatCertificateEnvelope = {
  data?: Array<{
    serial_no?: string;
    encrypt_certificate?: {
      algorithm?: string;
      nonce?: string;
      associated_data?: string;
      ciphertext?: string;
    };
  }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function normalizePem(value: string) {
  return value
    .replace(/^"([\s\S]*)"$/, "$1")
    .replace(/\\n/g, "\n")
    .trim();
}

function buildAuthorizationHeader(args: {
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
  const signer = createSign("RSA-SHA256");
  signer.update(message);
  signer.end();
  const signature = signer.sign(args.privateKeyPem, "base64");

  return {
    nonce,
    timestamp,
    authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${args.mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${args.serialNo}"`,
  };
}

function decryptCertificate(args: { apiV3Key: string; nonce: string; associatedData: string; ciphertext: string }) {
  const decoded = Buffer.from(args.ciphertext, "base64");
  const authTag = decoded.subarray(decoded.length - 16);
  const encrypted = decoded.subarray(0, decoded.length - 16);
  const decipher = createDecipheriv("aes-256-gcm", Buffer.from(args.apiV3Key, "utf8"), Buffer.from(args.nonce, "utf8"));
  decipher.setAAD(Buffer.from(args.associatedData, "utf8"));
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return plaintext.toString("utf8");
}

describe("wechat pay credentials validation", () => {
  it(
    "can fetch and decrypt platform certificates with merchant credentials",
    async () => {
      const mchid = getRequiredEnv("WECHAT_PAY_MCHID");
      const serialNo = getRequiredEnv("WECHAT_PAY_CERT_SERIAL_NO");
      const privateKeyPem = normalizePem(getRequiredEnv("WECHAT_PAY_PRIVATE_KEY_PEM"));
      const apiV3Key = getRequiredEnv("WECHAT_PAY_API_V3_KEY");
      const appId = getRequiredEnv("WECHAT_PAY_APPID");

      expect(appId.length).toBeGreaterThan(5);
      expect(apiV3Key.length).toBe(32);
      expect(privateKeyPem).toContain("BEGIN");

      const pathname = "/v3/certificates";
      const { authorization, nonce, timestamp } = buildAuthorizationHeader({
        mchid,
        serialNo,
        privateKeyPem,
        method: "GET",
        pathname,
      });

      const response = await fetch(`https://api.mch.weixin.qq.com${pathname}`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: authorization,
          "Wechatpay-Serial": serialNo,
          "User-Agent": "iCloush-Manus-Secret-Validation/1.0",
          "X-Request-Nonce": nonce,
          "X-Request-Timestamp": timestamp,
        },
      });

      const raw = await response.text();
      expect(response.status, raw).toBe(200);

      const payload = JSON.parse(raw) as WechatCertificateEnvelope;
      const firstCertificate = payload.data?.[0]?.encrypt_certificate;
      expect(firstCertificate?.algorithm).toBe("AEAD_AES_256_GCM");
      expect(firstCertificate?.ciphertext).toBeTruthy();
      expect(firstCertificate?.nonce).toBeTruthy();

      const certificatePem = decryptCertificate({
        apiV3Key,
        nonce: firstCertificate?.nonce ?? "",
        associatedData: firstCertificate?.associated_data ?? "",
        ciphertext: firstCertificate?.ciphertext ?? "",
      });

      expect(certificatePem).toContain("BEGIN CERTIFICATE");
      expect(certificatePem).toContain("END CERTIFICATE");
    },
    20000,
  );
});
