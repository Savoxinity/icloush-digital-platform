import { createDecipheriv, createHash, createPrivateKey, createPublicKey, createSign, randomUUID, type KeyObject } from "node:crypto";
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

type ParseAttempt = {
  ok: boolean;
  keyObject: KeyObject | null;
  error: string | null;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function normalizePem(value: string) {
  return value.replace(/^"([\s\S]*)"$/, "$1").replace(/\\n/g, "\n").trim();
}

function hasEncryptedKeyMarker(value: string) {
  return /BEGIN ENCRYPTED PRIVATE KEY/.test(value) || /Proc-Type:\s*4,ENCRYPTED/.test(value);
}

function tryParsePrivateKey(value: string): ParseAttempt {
  try {
    return {
      ok: true,
      keyObject: createPrivateKey({ key: value, format: "pem" }),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      keyObject: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function fingerprintDer(der: Buffer) {
  return createHash("sha256").update(der).digest("hex").toUpperCase();
}

function diagnosePrivateKey(rawValue: string) {
  const normalizedValue = normalizePem(rawValue);
  const rawAttempt = tryParsePrivateKey(rawValue);
  const normalizedAttempt = tryParsePrivateKey(normalizedValue);
  const activeAttempt = normalizedAttempt.ok ? normalizedAttempt : rawAttempt;
  const encryptedMarker = hasEncryptedKeyMarker(rawValue) || hasEncryptedKeyMarker(normalizedValue);
  const changedByNormalization = rawValue !== normalizedValue;

  const publicKeyFingerprint =
    activeAttempt.ok && activeAttempt.keyObject
      ? fingerprintDer(createPublicKey(activeAttempt.keyObject).export({ format: "der", type: "spki" }))
      : null;

  return {
    normalizedValue,
    rawAttempt,
    normalizedAttempt,
    activeAttempt,
    encryptedMarker,
    changedByNormalization,
    publicKeyFingerprint,
  };
}

function formatDiagnosisSummary(diagnosis: ReturnType<typeof diagnosePrivateKey>) {
  return [
    `raw_parse=${diagnosis.rawAttempt.ok ? "ok" : diagnosis.rawAttempt.error}`,
    `normalized_parse=${diagnosis.normalizedAttempt.ok ? "ok" : diagnosis.normalizedAttempt.error}`,
    `encrypted_marker=${diagnosis.encryptedMarker ? "yes" : "no"}`,
    `changed_by_normalization=${diagnosis.changedByNormalization ? "yes" : "no"}`,
    `public_key_fingerprint=${diagnosis.publicKeyFingerprint ?? "unavailable"}`,
  ].join("; ");
}

function assertPrivateKeyIsUsable() {
  const rawPrivateKey = getRequiredEnv("WECHAT_PAY_PRIVATE_KEY_PEM");
  const diagnosis = diagnosePrivateKey(rawPrivateKey);

  if (!diagnosis.rawAttempt.ok && !diagnosis.normalizedAttempt.ok) {
    throw new Error(
      [
        "当前商户私钥既不能以原始 PEM 被 Node/OpenSSL 解析，也不能在换行规范化后被解析。",
        diagnosis.encryptedMarker
          ? "检测到 ENCRYPTED PRIVATE KEY / Proc-Type 加密标记，更像是加密私钥缺少 passphrase。"
          : "未检测到加密标记，更像是 PEM 结构损坏、换行转义污染，或当前运行时与密钥格式不兼容。",
        formatDiagnosisSummary(diagnosis),
      ].join("\n"),
    );
  }

  if (!diagnosis.rawAttempt.ok && diagnosis.normalizedAttempt.ok && !diagnosis.changedByNormalization) {
    throw new Error(
      [
        "规范化后的私钥可以解析，但文本内容并未发生变化，这更像是当前运行时偶发兼容性问题或不可重复输入问题。",
        formatDiagnosisSummary(diagnosis),
      ].join("\n"),
    );
  }

  if (diagnosis.encryptedMarker && !diagnosis.activeAttempt.ok) {
    throw new Error(
      [
        "检测到加密私钥标记，且当前未提供 passphrase 时无法解析。",
        "微信支付签名通常应使用可直接加载的明文商户 API 私钥。",
        formatDiagnosisSummary(diagnosis),
      ].join("\n"),
    );
  }

  if (!diagnosis.activeAttempt.ok || !diagnosis.activeAttempt.keyObject) {
    throw new Error(`商户私钥未能通过可用性检查。${formatDiagnosisSummary(diagnosis)}`);
  }

  return diagnosis;
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
  it("classifies merchant private key usability before hitting WeChat gateway", () => {
    const diagnosis = assertPrivateKeyIsUsable();

    expect(diagnosis.publicKeyFingerprint).toMatch(/^[A-F0-9]{64}$/);
    expect(diagnosis.activeAttempt.keyObject?.asymmetricKeyType).toBe("rsa");
  });

  it(
    "can fetch and decrypt platform certificates with merchant credentials",
    async () => {
      const mchid = getRequiredEnv("WECHAT_PAY_MCHID");
      const serialNo = getRequiredEnv("WECHAT_PAY_CERT_SERIAL_NO");
      const diagnosis = assertPrivateKeyIsUsable();
      const privateKeyPem = diagnosis.normalizedValue;
      const apiV3Key = getRequiredEnv("WECHAT_PAY_API_V3_KEY");
      const appId = getRequiredEnv("WECHAT_PAY_APPID");

      expect(appId.length).toBeGreaterThan(5);
      expect(apiV3Key.length).toBe(32);
      expect(privateKeyPem).toContain("BEGIN");
      expect(serialNo).toMatch(/^[0-9A-F]{40}$/i);

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
      if (response.status !== 200) {
        let providerMessage = raw;
        try {
          const parsed = JSON.parse(raw) as { code?: string; message?: string; detail?: { issue?: string } };
          providerMessage = [
            parsed.code ? `code=${parsed.code}` : null,
            parsed.message ? `message=${parsed.message}` : null,
            parsed.detail?.issue ? `issue=${parsed.detail.issue}` : null,
          ]
            .filter(Boolean)
            .join("; ");
        } catch {
          // noop
        }

        throw new Error(
          [
            `微信平台证书拉取失败，HTTP ${response.status}。`,
            `网关返回：${providerMessage}`,
            `本地私钥诊断：${formatDiagnosisSummary(diagnosis)}`,
            diagnosis.activeAttempt.ok
              ? "因为私钥已能被当前 Node/OpenSSL 解析，且未落入明显的 PEM/换行/加密私钥解析失败分支，所以当前更像是商户证书序列号与私钥不成对，或环境中私钥文本虽可解析但已与微信商户平台原始私钥不一致。"
              : "当前错误首先需要回到私钥 PEM 解析层面处理。",
          ].join("\n"),
        );
      }

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
