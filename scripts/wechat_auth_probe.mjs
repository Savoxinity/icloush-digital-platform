import https from 'node:https';
import { createSign, randomUUID } from 'node:crypto';

function getRequiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`缺少环境变量 ${name}`);
  }
  return value;
}

function normalizePem(value) {
  return value.replace(/^"([\s\S]*)"$/, '$1').replace(/\\n/g, '\n').trim();
}

function buildAuthorizationHeader({ mchid, serialNo, privateKeyPem, method, pathname, body = '' }) {
  const nonce = randomUUID().replace(/-/g, '');
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const message = `${method}\n${pathname}\n${timestamp}\n${nonce}\n${body}\n`;
  const signer = createSign('RSA-SHA256');
  signer.update(message);
  signer.end();
  const signature = signer.sign(privateKeyPem, 'base64');

  return {
    nonce,
    timestamp,
    message,
    authorization: `WECHATPAY2-SHA256-RSA2048 mchid="${mchid}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${serialNo}"`,
  };
}

function summarizeError(error) {
  if (!error) return null;
  return {
    name: error.name,
    message: error.message,
    code: error.code,
    errno: error.errno,
    syscall: error.syscall,
    host: error.host,
    port: error.port,
  };
}

function requestWithHttps(url, headers) {
  return new Promise((resolve) => {
    const request = https.request(url, { method: 'GET', headers }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          ok: true,
          status: response.statusCode ?? null,
          headers: response.headers,
          body: Buffer.concat(chunks).toString('utf8'),
        });
      });
    });

    request.on('error', (error) => {
      resolve({ ok: false, error: summarizeError(error) });
    });

    request.setTimeout(15000, () => {
      request.destroy(new Error('HTTPS auth probe timeout'));
    });

    request.end();
  });
}

const mchid = getRequiredEnv('WECHAT_PAY_MCHID');
const serialNo = getRequiredEnv('WECHAT_PAY_CERT_SERIAL_NO');
const privateKeyPem = normalizePem(getRequiredEnv('WECHAT_PAY_PRIVATE_KEY_PEM'));
const pathname = '/v3/certificates';
const { authorization, nonce, timestamp, message } = buildAuthorizationHeader({
  mchid,
  serialNo,
  privateKeyPem,
  method: 'GET',
  pathname,
});

const headers = {
  Accept: 'application/json',
  Authorization: authorization,
  'Wechatpay-Serial': serialNo,
  'User-Agent': 'iCloush-Manus-Secret-Validation/1.0',
  'X-Request-Nonce': nonce,
  'X-Request-Timestamp': timestamp,
};

async function requestWithFetch(url, requestHeaders) {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: requestHeaders,
    });
    return {
      ok: true,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: await response.text(),
    };
  } catch (error) {
    return {
      ok: false,
      error: summarizeError(error),
      cause: summarizeError(error?.cause),
    };
  }
}

const url = `https://api.mch.weixin.qq.com${pathname}`;
const fetchResult = await requestWithFetch(url, headers);
const httpsResult = await requestWithHttps(url, headers);

console.log(
  JSON.stringify(
    {
      request: {
        mchid,
        serialNo,
        nonce,
        timestamp,
        message,
        headers,
      },
      fetchResult,
      httpsResult,
    },
    null,
    2,
  ),
);
