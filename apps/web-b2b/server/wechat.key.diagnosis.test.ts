import { createHash, createPrivateKey, createPublicKey, type KeyObject, X509Certificate } from "node:crypto";
import { describe, expect, it } from "vitest";

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function getOptionalEnv(...names: string[]) {
  for (const name of names) {
    const value = process.env[name];
    if (typeof value === "string" && value.trim().length > 0) {
      return value;
    }
  }
  return null;
}

function normalizePem(value: string) {
  return value.replace(/^"([\s\S]*)"$/, "$1").replace(/\\n/g, "\n").trim();
}

function hasEncryptedKeyMarker(value: string) {
  return /BEGIN ENCRYPTED PRIVATE KEY/.test(value) || /Proc-Type:\s*4,ENCRYPTED/.test(value);
}

type ParseAttempt = {
  ok: boolean;
  keyObject: KeyObject | null;
  error: string | null;
};

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

function normalizeSerial(serial: string) {
  return serial.replace(/[^0-9A-F]/gi, "").toUpperCase();
}

function buildKeyDiagnosis(rawPrivateKey: string) {
  const normalizedPrivateKey = normalizePem(rawPrivateKey);
  const rawAttempt = tryParsePrivateKey(rawPrivateKey);
  const normalizedAttempt = tryParsePrivateKey(normalizedPrivateKey);
  const activeAttempt = normalizedAttempt.ok ? normalizedAttempt : rawAttempt;

  return {
    rawPrivateKey,
    normalizedPrivateKey,
    rawAttempt,
    normalizedAttempt,
    changedByNormalization: rawPrivateKey !== normalizedPrivateKey,
    hasEncryptedMarker: hasEncryptedKeyMarker(rawPrivateKey) || hasEncryptedKeyMarker(normalizedPrivateKey),
    activeAttempt,
  };
}

function requireParsedKeyObject() {
  const rawPrivateKey = getRequiredEnv("WECHAT_PAY_PRIVATE_KEY_PEM");
  const diagnosis = buildKeyDiagnosis(rawPrivateKey);

  if (!diagnosis.activeAttempt.ok || !diagnosis.activeAttempt.keyObject) {
    throw new Error(
      [
        "微信商户私钥无法被当前 Node/OpenSSL 运行时解析。",
        `原始 PEM 解析结果：${diagnosis.rawAttempt.error ?? "ok"}`,
        `规范化 PEM 解析结果：${diagnosis.normalizedAttempt.error ?? "ok"}`,
        `是否检测到加密私钥标记：${diagnosis.hasEncryptedMarker ? "是" : "否"}`,
        `规范化是否改变原始文本：${diagnosis.changedByNormalization ? "是" : "否"}`,
      ].join("\n"),
    );
  }

  return diagnosis;
}

describe("wechat merchant key diagnosis", () => {
  it("distinguishes raw PEM parsing vs newline-normalized PEM parsing", () => {
    const rawPrivateKey = getRequiredEnv("WECHAT_PAY_PRIVATE_KEY_PEM");
    const diagnosis = buildKeyDiagnosis(rawPrivateKey);

    if (!diagnosis.rawAttempt.ok && !diagnosis.normalizedAttempt.ok) {
      throw new Error(
        [
          "原始 PEM 与规范化 PEM 均无法被 Node/OpenSSL 解析。",
          `原始解析错误：${diagnosis.rawAttempt.error ?? "unknown"}`,
          `规范化解析错误：${diagnosis.normalizedAttempt.error ?? "unknown"}`,
          diagnosis.hasEncryptedMarker
            ? "检测到 ENCRYPTED PRIVATE KEY / Proc-Type 加密标记，当前更像是加密私钥或缺失 passphrase。"
            : "未检测到加密标记，更像是 PEM 结构损坏、换行被转义污染，或当前运行时与密钥格式不兼容。",
        ].join("\n"),
      );
    }

    if (!diagnosis.rawAttempt.ok && diagnosis.normalizedAttempt.ok) {
      expect(diagnosis.changedByNormalization).toBe(true);
      return;
    }

    if (diagnosis.rawAttempt.ok && !diagnosis.normalizedAttempt.ok) {
      throw new Error(
        [
          "原始 PEM 可解析，但规范化后的 PEM 反而不可解析。",
          "这说明当前环境变量并不只是简单的 `\\n` 转义问题，进一步自动替换换行可能会破坏原文。",
          `规范化解析错误：${diagnosis.normalizedAttempt.error ?? "unknown"}`,
        ].join("\n"),
      );
    }

    expect(diagnosis.rawAttempt.ok || diagnosis.normalizedAttempt.ok).toBe(true);
  });

  it("surfaces whether the merchant private key behaves like an encrypted key", () => {
    const diagnosis = buildKeyDiagnosis(getRequiredEnv("WECHAT_PAY_PRIVATE_KEY_PEM"));

    if (diagnosis.hasEncryptedMarker && !diagnosis.activeAttempt.ok) {
      throw new Error(
        [
          "检测到私钥包含加密标记，且未提供 passphrase 时无法解析。",
          "当前更像是上传了加密私钥，而不是微信支付签名所需的可直接加载明文私钥。",
          `解析错误：${diagnosis.activeAttempt.error ?? "unknown"}`,
        ].join("\n"),
      );
    }

    expect(typeof diagnosis.hasEncryptedMarker).toBe("boolean");
  });

  it("derives a stable public-key fingerprint from the merchant private key", () => {
    const diagnosis = requireParsedKeyObject();
    const publicKey = createPublicKey(diagnosis.activeAttempt.keyObject!);
    const spkiDer = publicKey.export({ format: "der", type: "spki" });
    const fingerprint = fingerprintDer(spkiDer);

    expect(fingerprint).toMatch(/^[A-F0-9]{64}$/);
    expect(publicKey.asymmetricKeyType).toBe("rsa");
  });

  it("compares merchant certificate serial/public key when merchant certificate PEM is available", () => {
    const diagnosis = requireParsedKeyObject();
    const merchantCertificatePem = getOptionalEnv(
      "WECHAT_PAY_MERCHANT_CERT_PEM",
      "WECHAT_PAY_CERT_PEM",
      "WECHAT_PAY_CLIENT_CERT_PEM",
    );

    expect(
      merchantCertificatePem,
      "缺少商户证书 PEM，当前只能验证私钥可解析与公钥指纹，仍无法自动证明它与 `WECHAT_PAY_CERT_SERIAL_NO` 是同一对证书。请补充 `WECHAT_PAY_MERCHANT_CERT_PEM`、`WECHAT_PAY_CERT_PEM` 或 `WECHAT_PAY_CLIENT_CERT_PEM`。",
    ).toBeTruthy();

    const certificate = new X509Certificate(normalizePem(merchantCertificatePem!));
    const expectedSerial = normalizeSerial(getRequiredEnv("WECHAT_PAY_CERT_SERIAL_NO"));
    const actualSerial = normalizeSerial(certificate.serialNumber);
    const privateKeyFingerprint = fingerprintDer(
      createPublicKey(diagnosis.activeAttempt.keyObject!).export({ format: "der", type: "spki" }),
    );
    const certificateFingerprint = fingerprintDer(certificate.publicKey.export({ format: "der", type: "spki" }));

    expect(actualSerial).toBe(expectedSerial);
    expect(certificateFingerprint).toBe(privateKeyFingerprint);
  });
});
