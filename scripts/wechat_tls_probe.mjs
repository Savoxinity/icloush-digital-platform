import https from 'node:https';

const targetUrl = 'https://api.mch.weixin.qq.com/v3/certificates';

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

async function probeWithFetch(method) {
  try {
    const response = await fetch(targetUrl, { method });
    return {
      ok: true,
      method,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      bodyPreview: (await response.text()).slice(0, 300),
    };
  } catch (error) {
    return {
      ok: false,
      method,
      error: summarizeError(error),
      cause: summarizeError(error?.cause),
    };
  }
}

function probeWithHttps(method) {
  return new Promise((resolve) => {
    const request = https.request(targetUrl, { method }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve({
          ok: true,
          method,
          status: response.statusCode ?? null,
          headers: response.headers,
          bodyPreview: Buffer.concat(chunks).toString('utf8').slice(0, 300),
        });
      });
    });

    request.on('error', (error) => {
      resolve({
        ok: false,
        method,
        error: summarizeError(error),
      });
    });

    request.setTimeout(15000, () => {
      request.destroy(new Error('HTTPS probe timeout'));
    });

    request.end();
  });
}

const results = {
  fetchHead: await probeWithFetch('HEAD'),
  fetchGet: await probeWithFetch('GET'),
  httpsHead: await probeWithHttps('HEAD'),
  httpsGet: await probeWithHttps('GET'),
};

console.log(JSON.stringify(results, null, 2));
