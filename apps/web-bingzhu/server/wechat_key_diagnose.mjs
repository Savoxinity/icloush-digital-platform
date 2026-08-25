import { createPrivateKey, createPublicKey, createSign } from 'node:crypto';

const raw = process.env.WECHAT_PAY_PRIVATE_KEY_PEM ?? '';
const normalized = raw.replace(/^"([\s\S]*)"$/, '$1').replace(/\\n/g, '\n').trim();

function summarize(label, value) {
  const lines = value ? value.split('\n') : [];
  const firstLine = lines[0] ?? '';
  const lastLine = lines.at(-1) ?? '';
  const hasLiteralSlashN = value.includes('\\n');
  const realNewlineCount = (value.match(/\n/g) ?? []).length;
  return {
    label,
    length: value.length,
    firstLine,
    lastLine,
    hasLiteralSlashN,
    realNewlineCount,
    beginsWithEncrypted: firstLine.includes('BEGIN ENCRYPTED PRIVATE KEY'),
    beginsWithPrivate: firstLine.includes('BEGIN PRIVATE KEY'),
    beginsWithRsaPrivate: firstLine.includes('BEGIN RSA PRIVATE KEY'),
    beginsWithCertificate: firstLine.includes('BEGIN CERTIFICATE'),
  };
}

function tryParse(label, value) {
  try {
    const key = createPrivateKey({ key: value });
    const publicKey = createPublicKey(key).export({ type: 'spki', format: 'pem' }).toString();
    const signer = createSign('RSA-SHA256');
    signer.update('manus-wechat-key-diagnose');
    signer.end();
    const signature = signer.sign(key, 'base64');
    return {
      label,
      ok: true,
      asymmetricKeyType: key.asymmetricKeyType,
      publicKeyHeader: publicKey.split('\n')[0] ?? '',
      signatureLength: signature.length,
    };
  } catch (error) {
    return {
      label,
      ok: false,
      name: error?.name ?? 'Error',
      message: error?.message ?? String(error),
      code: error?.code ?? null,
      opensslErrorStack: error?.opensslErrorStack ?? null,
    };
  }
}

const result = {
  rawSummary: summarize('raw', raw),
  normalizedSummary: summarize('normalized', normalized),
  parseAttempts: [
    tryParse('raw', raw),
    tryParse('normalized', normalized),
  ],
};

console.log(JSON.stringify(result, null, 2));
